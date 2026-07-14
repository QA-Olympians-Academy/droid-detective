#!/usr/bin/env node
'use strict';

/**
 * Self-healing script: reads appium.log for failing selectors,
 * fetches the current UI hierarchy via ADB, asks a local Ollama
 * model to suggest fixes, patches the page-object files, then
 * re-runs the tests. No cloud API key required.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { OpenAI } = require('openai');

// TypeScript is a dev dependency; used to validate that a patch keeps the file
// parseable. If it isn't resolvable, we fall back to the selector-shape check.
let ts;
try { ts = require('typescript'); } catch { ts = null; }

// A patch is applied inside a `$('<selector>')` string literal. Reject anything
// that would break that literal (quotes, newlines, backticks) or is empty.
function isSafeSelector(sel) {
  return typeof sel === 'string' && sel.length > 0 && !/['\n\r`]/.test(sel);
}

// Would the patched source still parse as TypeScript? transpileModule reports
// SYNTACTIC diagnostics only, so it catches a malformed selector (e.g. TS1005)
// without failing on the project's runtime-only type setup.
function keepsParsing(source) {
  if (!ts) return true; // can't check — rely on isSafeSelector
  const out = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  });
  return !(out.diagnostics && out.diagnostics.length > 0);
}

// Dry-run: propose + validate patches but do not write files or retry tests.
const DRY_RUN = process.env.HEAL_DRY_RUN === '1' || process.env.HEAL_DRY_RUN === 'true';

// Ollama exposes an OpenAI-compatible endpoint; no real key is needed.
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

const LOG_FILE = 'appium.log';
const PAGE_OBJECTS_DIR = path.join(__dirname, '../../droid/pageobjects');

function readLog() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No appium.log found — skipping self-heal');
    process.exit(0);
  }
  return fs.readFileSync(LOG_FILE, 'utf8');
}

// Map a UiAutomator2 (strategy, value) pair to the WDIO selector form used in
// the page objects, so proposed patches match the source (`$('~Foo')` etc.).
function toWdioSelector(strategy, value) {
  if (strategy === 'accessibility id') return '~' + value;
  return value; // xpath / id (resource-id) / -android uiautomator are used verbatim
}

// Parse appium.log for locators that genuinely failed. Appium logs each element
// lookup as a request line carrying the selector, then an outcome line:
//   --> POST /session/<sid>/element {"using":"accessibility id","value":"Carousel"}
//   <-- POST /session/<sid>/element 404        (200 = found, 404 = not found)
// A selector is only a real failure if it NEVER succeeded — this filters out the
// transient 404s that happen while `waitForDisplayed` polls for an element that
// then appears. Requests are paired to responses by session id (spec workers
// interleave in one log).
function extractFailures(log) {
  const reqRe = /--> POST \/session\/([^/]+)\/element\s+\{"using":"([^"]+)","value":"((?:[^"\\]|\\.)*)"\}/;
  const resRe = /<-- POST \/session\/([^/]+)\/element (\d+)/;
  const pending = {};
  const succeeded = new Set();
  const failed = new Map();

  for (const line of log.split('\n')) {
    const rq = line.match(reqRe);
    if (rq) {
      pending[rq[1]] = { strategy: rq[2], value: rq[3].replace(/\\"/g, '"') };
      continue;
    }
    const rs = line.match(resRe);
    if (rs) {
      const p = pending[rs[1]];
      if (!p) continue;
      const key = `${p.strategy}|${p.value}`;
      if (rs[2] === '200') succeeded.add(key);
      else failed.set(key, p);
      delete pending[rs[1]];
    }
  }

  return [...failed.entries()]
    .filter(([key]) => !succeeded.has(key))
    .map(([, p]) => ({
      error: `NoSuchElementError: ${toWdioSelector(p.strategy, p.value)} (${p.strategy})`,
      selector: toWdioSelector(p.strategy, p.value),
    }));
}

// Preferred source: DOM snapshots captured by wdio.conf.ts `afterTest` AT THE
// MOMENT each test failed — so they contain the actual failing screen (unlike a
// post-hoc adb dump, which only sees whatever screen the app ended on).
const DOM_SNAPSHOT_DIR = path.join(__dirname, '../../dom-snapshots');
function getFailureDoms() {
  if (!fs.existsSync(DOM_SNAPSHOT_DIR)) return null;
  const files = fs.readdirSync(DOM_SNAPSHOT_DIR).filter(f => f.endsWith('.xml'));
  if (files.length === 0) return null;
  // Full content (not truncated) — the DOM-existence guard must see every
  // element, and the target may sit deep in the tree. The prompt is truncated
  // separately in askModelToHeal to bound the model's context.
  return files
    .map(f => `### Failing screen: ${f}\n${fs.readFileSync(path.join(DOM_SNAPSHOT_DIR, f), 'utf8')}`)
    .join('\n\n');
}

// Fallback: dump the CURRENT screen via ADB (only useful if the app is still on
// the failing screen — e.g. a single-screen run).
function getUiHierarchy() {
  try {
    execSync('adb shell uiautomator dump /sdcard/window_dump.xml', { stdio: 'pipe' });
    const xml = execSync('adb pull /sdcard/window_dump.xml /tmp/window_dump.xml && cat /tmp/window_dump.xml', {
      stdio: 'pipe',
    }).toString();
    return xml;
  } catch (err) {
    console.warn('Could not fetch UI hierarchy via ADB:', err.message);
    return null;
  }
}

function readPageObjects() {
  const files = fs.readdirSync(PAGE_OBJECTS_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  const contents = {};
  for (const file of files) {
    contents[file] = fs.readFileSync(path.join(PAGE_OBJECTS_DIR, file), 'utf8');
  }
  return contents;
}

const HEAL_SYSTEM_PROMPT = `You are an expert mobile test automation engineer. You repair broken WebdriverIO + Appium (Android/UiAutomator2) selectors by reading the live UI hierarchy and returning corrected selectors.

The UI hierarchy is Android XML. Each node may carry:
- content-desc="X"  → the element's ACCESSIBILITY ID; the WDIO selector is \`~X\`
- resource-id="X"   → the WDIO selector is \`//*[@resource-id="X"]\`
- text="X"          → the WDIO selector is \`//*[@text="X"]\`

A failing selector \`~X\` means "accessibility id X" (content-desc="X"). To fix it, find the element the test intended in the hierarchy and choose a new selector using this PRIORITY:
  1. a node with content-desc="Y"      → \`~Y\`
  2. else a node with resource-id="Y"  → \`//*[@resource-id="Y"]\`
  3. else a node with text="Y"         → \`//*[@text="Y"]\`
  4. else a minimal class-based XPath.

CRITICAL: if the failing \`~X\` has NO matching content-desc in the hierarchy but a node has resource-id="X" (or a clearly corresponding id), the label moved from content-desc to resource-id — use \`//*[@resource-id="X"]\`. NEVER invent a content-desc that is not present in the hierarchy.

COPY ATTRIBUTE VALUES VERBATIM from the hierarchy. Do NOT add a package prefix (e.g. do NOT turn resource-id="Carousel" into "com.app:id/carousel"), and do NOT change the case. Use the exact string that appears in the XML. If the value you would use does not appear literally in the hierarchy, you are guessing — don't.

Selector STRING rules (the value goes inside \`$('...')\`, a single-quoted JS string):
- NEVER use a single quote (') in the selector. In XPath, wrap values in DOUBLE quotes: \`//*[@resource-id="Carousel"]\`.
- One line only: no newlines, backticks, or leading/trailing spaces.

Worked example — failing \`~Carousel\`; the hierarchy contains \`<android.view.ViewGroup resource-id="Carousel" ...>\` and no content-desc="Carousel":
  correct → newSelector = \`//*[@resource-id="Carousel"]\`   (WRONG: \`//*[@content-desc='Carousel']\`)

OUTPUT FORMAT — return ONLY a JSON object (no prose, no markdown, no code fences), shaped EXACTLY:
{"patches":[{"file":"<page object filename, e.g. swipe.page.ts>","oldSelector":"<the failing selector, copied verbatim, e.g. ~Carousel>","newSelector":"<the corrected selector, e.g. //*[@resource-id=\\"Carousel\\"]>","reason":"<short reason>"}]}
One object in the array per failing selector. All JSON strings use double quotes; a double quote INSIDE a selector value (XPath) must be escaped as \\". Emit nothing before or after the JSON object.`;

// A STRICT JSON schema constrains the model's output SHAPE, not just "valid
// JSON". With plain json_object, llama3.1 on CI returned valid-but-wrong JSON
// ({"selector":"~Drag","old":{"elements":[…]}}) that carried no patch — json
// mode forces syntax, not structure. json_schema forces both, so every response
// is a {"patches":[…]} object the parser can read.
const PATCH_SCHEMA = {
  type: 'object',
  properties: {
    patches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          oldSelector: { type: 'string' },
          newSelector: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['file', 'oldSelector', 'newSelector', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['patches'],
  additionalProperties: false,
};

async function askModelToHeal(failures, uiHierarchy, pageObjects) {
  const pageObjectsText = Object.entries(pageObjects)
    .map(([name, content]) => `### ${name}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join('\n\n');

  const hierarchySection = uiHierarchy
    ? `\n\n## Current UI Hierarchy (ADB dump)\n\`\`\`xml\n${uiHierarchy.slice(0, 18000)}\n\`\`\``
    : '';

  const prompt = `Fix these failing selectors from a WebdriverIO + Appium test run.

## Failing selectors / errors
${failures.map(f => `- ${f.error}\n  ${f.selector}`).join('\n')}
${hierarchySection}

## Page Object files
${pageObjectsText}

Output one FILE/OLD/NEW/REASON block per failing selector, in the format described.`;

  // Small local models are non-deterministic about output format — retry a few
  // times until we get a parseable patch (parsePatches accepts blocks OR JSON).
  const MAX_ATTEMPTS = 5;
  let lastText = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        // Reliability + speed on a small CPU-bound model:
        //   - temperature 0 first try (deterministic); a small bump on retries.
        //   - response_format json_schema: Ollama constrains decoding to the exact
        //     PATCH_SCHEMA shape, so the model can't emit prose OR wrong-keyed JSON.
        //   - max_tokens: the patch JSON is tiny; capping output stops the model
        //     rambling for minutes on CPU (each token is a slow CPU step in CI).
        temperature: attempt === 1 ? 0 : 0.3,
        max_tokens: 800,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'selector_patches', strict: true, schema: PATCH_SCHEMA },
        },
        messages: [
          { role: 'system', content: HEAL_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });
      lastText = response.choices[0]?.message?.content || '';
      const patches = parsePatches(lastText);
      if (patches.length > 0) return patches;
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS}: no parseable patch in model output${attempt < MAX_ATTEMPTS ? ' — retrying' : ''}`);
    } catch (err) {
      // The model server can die mid-request under CI memory pressure (e.g.
      // "llama-server process has terminated: segmentation fault"). Don't abort
      // the whole run — Ollama respawns the server, so back off briefly and retry.
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS}: model call failed (${err.message.split('\n')[0]})${attempt < MAX_ATTEMPTS ? ' — retrying' : ''}`);
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.warn('Model never returned a parseable patch. Last raw output:\n----\n' + lastText.slice(0, 500) + '\n----');
  return [];
}

// Parse the model's patches. With response_format json_object the model returns
// a {"patches":[...]} object (or a bare array) — that's the primary path. A
// plaintext FILE/OLD/NEW/REASON block parser is kept as a fallback for runs
// against models/endpoints that don't honor the JSON format constraint.
function parsePatches(text) {
  const norm = arr => (Array.isArray(arr) ? arr : [])
    .filter(p => p && p.file && p.oldSelector && p.newSelector)
    .map(p => ({ file: p.file, oldSelector: p.oldSelector, newSelector: p.newSelector, reason: p.reason || 'healed' }));

  // 1) Preferred (matches the forced response_format): a JSON object
  //    {"patches":[...]}, or a bare array. Try the whole string first — that
  //    handles brackets inside a reason string — then a substring fallback for
  //    any stray text a run wraps around the JSON.
  for (const candidate of [text, (text.match(/[[{][\s\S]*[\]}]/) || [])[0]]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate.replace(/,(\s*[\]}])/g, '$1'));
      const arr = Array.isArray(parsed) ? parsed : parsed.patches;
      const out = norm(arr);
      if (out.length) return out;
    } catch { /* not JSON on this candidate — try the next */ }
  }

  // 2) Fallback: plaintext FILE/OLD/NEW/REASON blocks. Leading markdown
  //    (**, -, >, #) and a trailing "**" after the label are tolerated.
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
  return patches;
}

// Reject selectors whose target isn't actually present in the captured DOM —
// this catches HALLUCINATED values (e.g. a made-up package-qualified resource-id
// like com.app:id/carousel when the real one is just "Carousel").
function selectorTargetInDom(selector, dom) {
  if (!dom) return true; // no DOM to check against — the other guards still apply
  const acc = selector.match(/^~(.+)$/);
  if (acc) return dom.includes(`content-desc="${acc[1]}"`);
  const attrs = [...selector.matchAll(/@([\w-]+)\s*(?:=|,)\s*["']([^"']+)["']/g)];
  if (attrs.length) return attrs.every(([, attr, val]) => dom.includes(`${attr}="${val}"`));
  return true; // class-only xpath / unrecognized form — can't verify, allow
}

// Validate + apply each patch. A patch is rejected (never written) if the file
// or selector is missing, the new selector is malformed, would no longer parse,
// or targets an element not in the captured DOM — so a bad or hallucinated model
// suggestion can't corrupt a page object or apply a wrong selector. In dry-run
// mode nothing is written; results are reported.
function applyPatches(patches, pageObjects, failingSelectors, dom) {
  let applied = 0;
  for (const patch of patches) {
    // Small models often emit XPath with SINGLE quotes (//*[@id='X']) — that's
    // valid XPath but would break the single-quoted `$('...')` literal. Double
    // quotes work fine inside `$('...')`, so normalize rather than reject an
    // otherwise-correct selector purely for quote style.
    const newSelector = patch.newSelector.replace(/'/g, '"');
    const label = `${patch.file}: "${patch.oldSelector}" → "${newSelector}"`;
    const filePath = path.join(PAGE_OBJECTS_DIR, patch.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`✗ skip (file not found): ${patch.file}`);
      continue;
    }
    // Only ever touch selectors that ACTUALLY failed — never "fix" a working one.
    if (!failingSelectors.has(patch.oldSelector)) {
      console.warn(`✗ reject (not a detected failure — refusing to modify a working selector): ${label}`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(patch.oldSelector)) {
      console.warn(`✗ skip (old selector not present): ${label}`);
      continue;
    }
    if (!isSafeSelector(newSelector)) {
      console.warn(`✗ reject (malformed selector — would break the string literal): ${label}`);
      continue;
    }
    if (!selectorTargetInDom(newSelector, dom)) {
      console.warn(`✗ reject (target not in captured DOM — likely a hallucinated value): ${label}`);
      continue;
    }
    const updated = content.replaceAll(patch.oldSelector, newSelector);
    if (!keepsParsing(updated)) {
      console.warn(`✗ reject (patch breaks TypeScript compilation): ${label}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`✓ valid (dry-run, not written): ${label} — ${patch.reason}`);
    } else {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`✓ patched ${label} (${patch.reason})`);
    }
    applied++;
  }
  return applied;
}

async function main() {
  console.log('🔧 Self-healing: reading failure log…');
  const log = readLog();
  const failures = extractFailures(log);

  if (failures.length === 0) {
    console.log('No selector failures detected — nothing to heal');
    process.exit(0);
  }

  console.log(`Found ${failures.length} selector failure(s)`);
  const failingSelectors = new Set(failures.map(f => f.selector));
  // Prefer failure-time DOM snapshots (real failing screen); fall back to a live dump.
  const uiHierarchy = getFailureDoms() || getUiHierarchy();
  if (getFailureDoms()) console.log('Using failure-time DOM snapshot(s) from dom-snapshots/');
  const pageObjects = readPageObjects();

  console.log(`Asking ${MODEL} (Ollama) for healing suggestions…`);
  const patches = await askModelToHeal(failures, uiHierarchy, pageObjects);

  if (patches.length === 0) {
    console.log('No patches suggested');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN — validating ${patches.length} proposed patch(es), no files written:`);
    const valid = applyPatches(patches, pageObjects, failingSelectors, uiHierarchy);
    console.log(`\n${valid} of ${patches.length} proposed patch(es) are valid and would be applied.`);
    process.exit(valid > 0 ? 0 : 1);
  }

  const applied = applyPatches(patches, pageObjects, failingSelectors, uiHierarchy);
  console.log(`Applied ${applied} patch(es)`);

  if (applied > 0) {
    console.log('Re-running tests after healing…');
    try {
      execSync('pnpm test', { stdio: 'inherit' });
      console.log('✅ Tests passed after self-healing');
      process.exit(0);
    } catch {
      console.log('❌ Tests still failing after self-healing');
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('heal-and-retry error:', err);
  process.exit(1);
});
