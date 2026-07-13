#!/usr/bin/env node
'use strict';

/**
 * Self-healing example — stripped-down version for workshop study.
 *
 * The healing pattern, with the safety layers the production script uses:
 *   1. Parse appium.log for locators that GENUINELY failed
 *   2. Feed the model the DOM of the failing screen (captured at failure time)
 *   3. Ask a local model for patches, guided by a strict system prompt
 *   4. VALIDATE each patch (safe selector, still-compiles, only-failing) before writing
 *   5. Retry the tests
 *
 * The production version is at .github/scripts/heal-and-retry.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

// TypeScript (a dev dependency) lets us confirm a patch keeps the file parseable.
let ts;
try { ts = require('typescript'); } catch { ts = null; }

// A patch is inserted into a `$('<selector>')` string literal — reject anything
// that would break it (quotes/newlines/backticks) or is empty.
function isSafeSelector(sel) {
  return typeof sel === 'string' && sel.length > 0 && !/['\n\r`]/.test(sel);
}
// Would the patched source still PARSE? transpileModule reports syntax errors
// only, so a malformed selector is caught without failing on type-only setup.
function keepsParsing(source) {
  if (!ts) return true;
  const out = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2020 } });
  return !(out.diagnostics && out.diagnostics.length > 0);
}

// The system prompt is what turns a small local model from "guess a content-desc
// xpath" into "read the real attribute and pick the right strategy".
const SYSTEM_PROMPT = `You are an expert mobile test automation engineer. You repair broken WebdriverIO + Appium (Android/UiAutomator2) selectors by reading the live UI hierarchy.

Each hierarchy node may carry:
- content-desc="X"  → accessibility id; WDIO selector is \`~X\`
- resource-id="X"   → WDIO selector is \`//*[@resource-id="X"]\`
- text="X"          → WDIO selector is \`//*[@text="X"]\`

A failing \`~X\` means accessibility id X (content-desc="X"). Fix it by finding the intended element and choosing a selector by PRIORITY:
  1. content-desc="Y" → \`~Y\`   2. resource-id="Y" → \`//*[@resource-id="Y"]\`   3. text="Y" → \`//*[@text="Y"]\`   4. class-based XPath.

CRITICAL: if \`~X\` has no matching content-desc but a node has resource-id="X", the label moved to resource-id — use \`//*[@resource-id="X"]\`. Never invent a content-desc that isn't in the hierarchy.

COPY ATTRIBUTE VALUES VERBATIM from the hierarchy — no package prefix (do NOT turn resource-id="Carousel" into "com.app:id/carousel"), no case changes. If a value doesn't appear literally in the XML, you're guessing — don't.

STRING rules: never use a single quote (') — in XPath use DOUBLE quotes (\`//*[@resource-id="Carousel"]\`); one line, no backticks.

Example — failing \`~Carousel\`, hierarchy has \`<... resource-id="Carousel">\` and no content-desc="Carousel":
  correct → \`//*[@resource-id="Carousel"]\`  (WRONG: \`//*[@content-desc='Carousel']\`)

OUTPUT FORMAT — for EACH selector to fix, output exactly four lines:
FILE: <page object filename>
OLD: <the failing selector, verbatim>
NEW: <the corrected selector>
REASON: <short reason>
Separate multiple fixes with a line containing only: ---
Output NOTHING else — no JSON, no code fences, no quotes around values. (Plain lines avoid JSON quote-escaping problems that trip up small models.)`;

// Step 1 — parse the log for locators that genuinely failed. Appium logs each
// lookup as a request line with the selector, then an outcome (200 found / 404
// not). A selector is a real failure only if it NEVER succeeded — this skips the
// transient 404s while waitForDisplayed polls. Paired by session id.
function extractFailedSelectors(logPath) {
  const log = fs.readFileSync(logPath, 'utf8');
  const reqRe = /--> POST \/session\/([^/]+)\/element\s+\{"using":"([^"]+)","value":"((?:[^"\\]|\\.)*)"\}/;
  const resRe = /<-- POST \/session\/([^/]+)\/element (\d+)/;
  const pending = {};
  const succeeded = new Set();
  const failed = new Map();

  for (const line of log.split('\n')) {
    const rq = line.match(reqRe);
    if (rq) { pending[rq[1]] = { strategy: rq[2], value: rq[3].replace(/\\"/g, '"') }; continue; }
    const rs = line.match(resRe);
    if (rs && pending[rs[1]]) {
      const p = pending[rs[1]];
      const key = `${p.strategy}|${p.value}`;
      if (rs[2] === '200') succeeded.add(key);
      else failed.set(key, p);
      delete pending[rs[1]];
    }
  }

  return [...failed.entries()]
    .filter(([key]) => !succeeded.has(key))
    .map(([, p]) => (p.strategy === 'accessibility id' ? '~' + p.value : p.value));
}

// Step 2 — the DOM of the failing screen. Prefer snapshots captured by the wdio
// `afterTest` hook AT FAILURE TIME (they contain the real failing screen); fall
// back to a live adb dump (only useful if the app is still on that screen).
function getFailureDoms() {
  const dir = path.join(__dirname, '../../../dom-snapshots');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xml'));
  if (!files.length) return null;
  return files
    // Full content — the DOM guard must see every element (the target can sit
    // deep in the tree, past any small cutoff).
    .map(f => `### Failing screen: ${f}\n${fs.readFileSync(path.join(dir, f), 'utf8')}`)
    .join('\n\n');
}
function getLiveHierarchy() {
  try {
    execSync('adb shell uiautomator dump /sdcard/dump.xml', { stdio: 'pipe' });
    execSync('adb pull /sdcard/dump.xml /tmp/dump.xml', { stdio: 'pipe' });
    return fs.readFileSync('/tmp/dump.xml', 'utf8').slice(0, 8000);
  } catch {
    return null;
  }
}

// Step 3 — ask a local model for patches (system prompt + the failure data)
async function getPatches(failures, hierarchy, pageObjectsDir) {
  const files = fs.readdirSync(pageObjectsDir).filter(f => f.endsWith('.ts'));
  const pageObjectsText = files
    .map(f => `### ${f}\n\`\`\`typescript\n${fs.readFileSync(path.join(pageObjectsDir, f), 'utf8')}\n\`\`\``)
    .join('\n\n');

  const userMsg = `Fix these failing selectors.

Failing selectors:
${failures.join('\n')}

${hierarchy ? `UI hierarchy of the failing screen(s):\n\`\`\`xml\n${hierarchy}\n\`\`\`` : 'No hierarchy available.'}

Page objects:
${pageObjectsText}

Output one FILE/OLD/NEW/REASON block per failing selector.`;

  // Small local models are non-deterministic about format — retry until parseable.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
    });
    const patches = parsePatches(response.choices[0]?.message?.content || '');
    if (patches.length) return patches;
    console.warn(`Attempt ${attempt}/5: no parseable patch${attempt < 5 ? ' — retrying' : ''}`);
  }
  return [];
}

// Parse the model's patches, tolerant of what a small model actually returns:
// FILE/OLD/NEW/REASON blocks (optionally wrapped in markdown bold/bullets), or —
// as a fallback — a JSON array.
function parsePatches(text) {
  const strip = s => s.replace(/^[\s>*`'"-]+/, '').replace(/[\s*`'"]+$/, '').trim();
  const patches = [];
  for (const block of text.split(/^\s*-{3,}\s*$/m)) {
    const grab = label => {
      const m = block.match(new RegExp(`^[\\s>*\`#-]*${label}:\\**\\s*(.+)$`, 'mi'));
      return m ? strip(m[1]) : '';
    };
    const file = grab('FILE');
    const oldSelector = grab('OLD');
    const newSelector = grab('NEW');
    const reason = grab('REASON') || 'healed';
    if (file && oldSelector && newSelector) patches.push({ file, oldSelector, newSelector, reason });
  }
  if (patches.length) return patches;

  // Fallback: a JSON array (some runs emit JSON despite the instructions).
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const arr = JSON.parse(m[0].replace(/,(\s*[\]}])/g, '$1'));
      return (Array.isArray(arr) ? arr : [])
        .filter(p => p && p.file && p.oldSelector && p.newSelector)
        .map(p => ({ file: p.file, oldSelector: p.oldSelector, newSelector: p.newSelector, reason: p.reason || 'healed' }));
    } catch { /* unparseable JSON — give up */ }
  }
  return [];
}

// Reject selectors whose target isn't actually present in the captured DOM —
// catches HALLUCINATED values (e.g. a made-up "com.app:id/carousel" when the
// real resource-id is just "Carousel").
function selectorTargetInDom(selector, dom) {
  if (!dom) return true;
  const acc = selector.match(/^~(.+)$/);
  if (acc) return dom.includes(`content-desc="${acc[1]}"`);
  const attrs = [...selector.matchAll(/@([\w-]+)\s*(?:=|,)\s*["']([^"']+)["']/g)];
  if (attrs.length) return attrs.every(([, attr, val]) => dom.includes(`${attr}="${val}"`));
  return true;
}

// Step 4 — validate, then apply. A patch is rejected (never written) if the file
// or selector is missing, the selector wasn't one that actually failed, the new
// selector is malformed, the result no longer parses, or it targets an element
// not in the captured DOM — so a bad or hallucinated suggestion can't corrupt a
// page object or apply a wrong selector.
function applyPatches(patches, pageObjectsDir, failingSelectors, dom) {
  let count = 0;
  for (const { file, oldSelector, newSelector, reason } of patches) {
    const label = `${file}: "${oldSelector}" → "${newSelector}"`;
    const filePath = path.join(pageObjectsDir, file);

    if (!fs.existsSync(filePath)) { console.warn(`✗ skip (no file): ${file}`); continue; }
    if (!failingSelectors.has(oldSelector)) { console.warn(`✗ reject (not a detected failure — won't touch a working selector): ${label}`); continue; }
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(oldSelector)) { console.warn(`✗ skip (selector not in file): ${label}`); continue; }
    if (!isSafeSelector(newSelector)) { console.warn(`✗ reject (malformed selector): ${label}`); continue; }
    if (!selectorTargetInDom(newSelector, dom)) { console.warn(`✗ reject (target not in captured DOM — likely hallucinated): ${label}`); continue; }
    const updated = content.replaceAll(oldSelector, newSelector);
    if (!keepsParsing(updated)) { console.warn(`✗ reject (breaks compilation): ${label}`); continue; }

    fs.writeFileSync(filePath, updated);
    console.log(`✓ patched ${label} (${reason})`);
    count++;
  }
  return count;
}

// Main
async function main() {
  const logPath = 'appium.log';
  if (!fs.existsSync(logPath)) {
    console.log('No appium.log found');
    process.exit(0);
  }

  const failures = extractFailedSelectors(logPath);
  if (!failures.length) {
    console.log('No selector failures found');
    process.exit(0);
  }

  console.log(`Found ${failures.length} failing selector(s): ${failures.join(', ')}`);
  const failingSelectors = new Set(failures);
  const hierarchy = getFailureDoms() || getLiveHierarchy();

  const pageObjectsDir = path.join(__dirname, '../../../droid/pageobjects');
  const patches = await getPatches(failures, hierarchy, pageObjectsDir);
  if (!patches.length) {
    console.log('No patches suggested');
    process.exit(1);
  }

  const applied = applyPatches(patches, pageObjectsDir, failingSelectors, hierarchy);
  if (!applied) {
    console.log('No valid patches to apply');
    process.exit(1);
  }

  console.log('Retrying tests after healing...');
  try {
    execSync('pnpm test', { stdio: 'inherit' });
    console.log('✅ Tests passed after self-healing');
  } catch {
    console.log('❌ Tests still failing after healing');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
