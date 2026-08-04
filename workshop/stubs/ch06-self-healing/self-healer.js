#!/usr/bin/env node
'use strict';

/**
 * CH6 — SELF-HEALER  (WORKSHOP EXERCISE STUB)
 *
 * Implement the healing pipeline against the fixtures in ./fixtures:
 *   1. DETECT → 2. OBSERVE → 3. PROPOSE → 4. VALIDATE → 5. APPLY
 *
 * `main()` and the validation gates are provided; you implement detection and
 * the heuristic proposer. Run `node examples/ch06-self-healing/self-healer.js`
 * — it should heal `~Login-tab` (rename) and `~button-LOGIN` (strategy switch).
 *
 * Reference implementation: git checkout main -- examples/ch06-self-healing
 * Annotated production version: workshop/06-self-healing/examples/heal-and-retry.js
 */

const fs = require('fs');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const OUT_DIR = path.join(__dirname, '.healed');

// ── 1. DETECT ─────────────────────────────────────────────────────────────────
// Appium logs each element lookup as a request line:
//   --> POST /session/<id>/element {"using":"accessibility id","value":"X"}
// followed by an outcome line:
//   <-- POST /session/<id>/element 200|404 ...
function extractFailedSelectors(logPath) {
  // TODO(ch6): pair requests with responses by session id, and return only
  // selectors that NEVER succeeded (a 404 followed by a 200 for the same
  // selector is just waitForDisplayed polling — not a real failure).
  // Return accessibility-id failures in `~value` form.
  throw new Error('TODO(ch6): implement extractFailedSelectors');
}

// ── 2. OBSERVE ────────────────────────────────────────────────────────────────
function loadFailureDom(domPath) {
  return fs.existsSync(domPath) ? fs.readFileSync(domPath, 'utf8') : null;
}

// ── 3. PROPOSE (heuristic) ────────────────────────────────────────────────────
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function proposePatchesHeuristic(failures, dom) {
  // TODO(ch6): for each failing `~value`, cover the two classic drift cases:
  //   a) the label MOVED to resource-id → the DOM contains
  //      `resource-id="value"` → propose `//*[@resource-id="value"]`
  //   b) Category A RENAME → find the content-desc in the DOM whose
  //      normalised form contains (or is contained by) the failing value;
  //      exactly one match → propose `~renamed`. Ambiguity → propose nothing.
  // Each patch: { oldSelector, newSelector, reason }.
  throw new Error('TODO(ch6): implement proposePatchesHeuristic');
}

// ── 4. VALIDATE (provided — a bad suggestion must never be written) ───────────
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

// ── 5. APPLY (provided — patches COPIES in ./.healed, so runs are repeatable) ─
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

// ── Main (provided) ───────────────────────────────────────────────────────────
async function main() {
  const failures = extractFailedSelectors(path.join(FIXTURES, 'appium-failure.log'));
  if (!failures.length) { console.log('No selector failures found'); return; }
  console.log(`1. DETECT   — ${failures.length} genuinely failing selector(s): ${failures.join(', ')}`);

  const dom = loadFailureDom(path.join(FIXTURES, 'failing-screen.xml'));
  console.log(`2. OBSERVE  — failing-screen DOM loaded (${dom.length} chars)`);

  const patches = proposePatchesHeuristic(failures, dom);
  console.log(`3. PROPOSE  — ${patches.length} patch(es) via heuristic`);

  console.log('4+5. VALIDATE & APPLY');
  const applied = applyPatches(patches, path.join(FIXTURES, 'pageobjects'), new Set(failures), dom);

  if (applied) {
    console.log(`\n✅ ${applied} selector(s) healed → ${path.relative(process.cwd(), OUT_DIR)}/`);
  } else {
    console.log('\n❌ nothing healed');
    process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
