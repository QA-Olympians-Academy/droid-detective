#!/usr/bin/env node
'use strict';

/**
 * CH6 — SELF-HEALER
 *
 * The healing pipeline, runnable offline against the fixtures in ./fixtures:
 *
 *   1. DETECT   — parse appium.log for selectors that GENUINELY failed
 *                 (never succeeded — skips transient waitForDisplayed 404s)
 *   2. OBSERVE  — load the DOM of the failing screen (captured at failure time)
 *   3. PROPOSE  — suggest a replacement selector per failure. Deterministic
 *                 heuristic by default; add --llm to ask a local model instead
 *                 (the production approach — see workshop/06-self-healing/
 *                 examples/heal-and-retry.js for the full prompt engineering).
 *   4. VALIDATE — reject unsafe / hallucinated / not-actually-failing patches
 *   5. APPLY    — patch a COPY of the page objects (./.healed) and show the diff
 *
 * Run it:               node examples/ch06-self-healing/self-healer.js
 * With a local model:   node examples/ch06-self-healing/self-healer.js --llm
 */

const fs = require('fs');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const OUT_DIR = path.join(__dirname, '.healed');

// ── 1. DETECT ─────────────────────────────────────────────────────────────────
// Appium logs each element lookup as a request line, then an outcome
// (200 found / 404 not). A selector is a real failure only if it NEVER
// succeeded during the run. Requests/responses are paired by session id.
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
      if (rs[2] === '200') succeeded.add(key); else failed.set(key, p);
      delete pending[rs[1]];
    }
  }

  return [...failed.entries()]
    .filter(([key]) => !succeeded.has(key))
    .map(([, p]) => (p.strategy === 'accessibility id' ? '~' + p.value : p.value));
}

// ── 2. OBSERVE ────────────────────────────────────────────────────────────────
function loadFailureDom(domPath) {
  return fs.existsSync(domPath) ? fs.readFileSync(domPath, 'utf8') : null;
}

// ── 3. PROPOSE (heuristic) ────────────────────────────────────────────────────
// Covers the two most common drift cases without any LLM:
//   Category A — RENAME: the content-desc changed slightly
//                → find the closest content-desc still in the DOM.
//   The classic gotcha — the label MOVED to resource-id
//                → same value now lives in resource-id; switch strategy.
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function closestContentDesc(value, dom) {
  const target = normalise(value);
  const candidates = [...dom.matchAll(/content-desc="([^"]+)"/g)].map((m) => m[1]);
  // "closest" = one normalised string contains the other (rename with a
  // suffix/prefix, case change, separator change). Ambiguity → no proposal.
  const hits = [...new Set(candidates.filter((c) => {
    const n = normalise(c);
    return n.includes(target) || target.includes(n);
  }))];
  return hits.length === 1 ? hits[0] : null;
}

function proposePatchesHeuristic(failures, dom) {
  const patches = [];
  for (const failing of failures) {
    if (!failing.startsWith('~')) continue; // heuristic handles a11y ids only
    const value = failing.slice(1);

    if (dom.includes(`resource-id="${value}"`)) {
      patches.push({
        oldSelector: failing,
        newSelector: `//*[@resource-id="${value}"]`,
        reason: 'label moved from content-desc to resource-id',
      });
      continue;
    }
    const renamed = closestContentDesc(value, dom);
    if (renamed && renamed !== value) {
      patches.push({
        oldSelector: failing,
        newSelector: `~${renamed}`,
        reason: `content-desc renamed "${value}" → "${renamed}"`,
      });
    }
  }
  return patches;
}

// ── 3b. PROPOSE (LLM) — the production approach, kept minimal here ────────────
async function proposePatchesLlm(failures, dom) {
  const { OpenAI } = require('openai');
  const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
  });
  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL || 'llama3.1',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You repair broken Appium selectors by reading the UI hierarchy. ' +
          'A failing ~X means content-desc="X". Pick by priority: content-desc → ~Y; ' +
          'resource-id → //*[@resource-id="Y"]; text → //*[@text="Y"]. Copy values VERBATIM. ' +
          'Reply ONLY with JSON: {"patches":[{"oldSelector":"","newSelector":"","reason":""}]}',
      },
      { role: 'user', content: `Failing selectors:\n${failures.join('\n')}\n\nHierarchy:\n${dom}` },
    ],
  });
  try {
    return JSON.parse(response.choices[0].message.content).patches || [];
  } catch {
    return [];
  }
}

// ── 4. VALIDATE ───────────────────────────────────────────────────────────────
// Every gate the production script uses: a bad suggestion must never be written.
const isSafeSelector = (sel) => typeof sel === 'string' && sel.length > 0 && !/['\n\r`]/.test(sel);

function selectorTargetInDom(selector, dom) {
  const acc = selector.match(/^~(.+)$/);
  if (acc) return dom.includes(`content-desc="${acc[1]}"`);
  const attrs = [...selector.matchAll(/@([\w-]+)\s*=\s*["']([^"']+)["']/g)];
  if (attrs.length) return attrs.every(([, attr, val]) => dom.includes(`${attr}="${val}"`));
  return true;
}

function validatePatch(patch, failingSelectors, dom) {
  if (!failingSelectors.has(patch.oldSelector)) return 'not a detected failure — won\'t touch a working selector';
  if (!isSafeSelector(patch.newSelector)) return 'malformed selector';
  if (!selectorTargetInDom(patch.newSelector, dom)) return 'target not in captured DOM — likely hallucinated';
  return null;
}

// ── 5. APPLY ──────────────────────────────────────────────────────────────────
// Patches are applied to a COPY in ./.healed so the run is repeatable; the
// production script (and --live CI) writes to droid/pageobjects directly.
function applyPatches(patches, pageObjectsDir, failingSelectors, dom) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let applied = 0;
  for (const file of fs.readdirSync(pageObjectsDir).filter((f) => f.endsWith('.ts'))) {
    let content = fs.readFileSync(path.join(pageObjectsDir, file), 'utf8');

    for (const patch of patches) {
      const label = `${file}: "${patch.oldSelector}" → "${patch.newSelector}"`;
      if (!content.includes(patch.oldSelector)) continue;
      const rejection = validatePatch(patch, failingSelectors, dom);
      if (rejection) { console.warn(`✗ reject (${rejection}): ${label}`); continue; }

      content = content.replaceAll(patch.oldSelector, patch.newSelector);
      console.log(`✓ patched ${label}\n  reason: ${patch.reason}`);
      applied++;
    }
    fs.writeFileSync(path.join(OUT_DIR, file), content);
  }
  return applied;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const useLlm = process.argv.includes('--llm');

  const failures = extractFailedSelectors(path.join(FIXTURES, 'appium-failure.log'));
  if (!failures.length) { console.log('No selector failures found'); return; }
  console.log(`1. DETECT   — ${failures.length} genuinely failing selector(s): ${failures.join(', ')}`);

  const dom = loadFailureDom(path.join(FIXTURES, 'failing-screen.xml'));
  console.log(`2. OBSERVE  — failing-screen DOM loaded (${dom.length} chars)`);

  const patches = useLlm
    ? await proposePatchesLlm(failures, dom)
    : proposePatchesHeuristic(failures, dom);
  console.log(`3. PROPOSE  — ${patches.length} patch(es) via ${useLlm ? 'local LLM' : 'heuristic'}`);

  console.log('4+5. VALIDATE & APPLY');
  const applied = applyPatches(patches, path.join(FIXTURES, 'pageobjects'), new Set(failures), dom);

  if (applied) {
    console.log(`\n✅ ${applied} selector(s) healed → ${path.relative(process.cwd(), OUT_DIR)}/`);
    console.log('   (in CI the next step is: retry `pnpm test` — see workshop/09-ci-github)');
  } else {
    console.log('\n❌ nothing healed — in CI this escalates to analyse-failures.js (ch9)');
    process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
