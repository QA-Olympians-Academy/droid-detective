#!/usr/bin/env node
'use strict';

/**
 * Self-healing example — stripped-down version for workshop study.
 *
 * This script demonstrates the three-step healing pattern:
 *   1. Parse the Appium log for failing selectors
 *   2. Fetch the current UI hierarchy from the running device
 *   3. Ask a local model to patch the page objects, then retry
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

// Step 1 — parse the log for locators that genuinely failed.
// Appium logs each lookup as a request line carrying the selector, then an
// outcome line (200 = found, 404 = not found), e.g.:
//   --> POST /session/<sid>/element {"using":"accessibility id","value":"Carousel"}
//   <-- POST /session/<sid>/element 404
// A selector is a real failure only if it NEVER succeeded — this skips the
// transient 404s emitted while waitForDisplayed polls for an element that then
// appears. Requests pair to responses by session id (spec workers interleave).
function extractFailedSelectors(logPath) {
  const log = fs.readFileSync(logPath, 'utf8');
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
    if (rs && pending[rs[1]]) {
      const p = pending[rs[1]];
      const key = `${p.strategy}|${p.value}`;
      if (rs[2] === '200') succeeded.add(key);
      else failed.set(key, p);
      delete pending[rs[1]];
    }
  }

  // Map (strategy, value) back to the page-object selector form: `~Foo` for
  // accessibility ids, everything else verbatim.
  return [...failed.entries()]
    .filter(([key]) => !succeeded.has(key))
    .map(([, p]) => (p.strategy === 'accessibility id' ? '~' + p.value : p.value));
}

// Step 2 — get the current hierarchy via ADB
function getPageHierarchy() {
  try {
    execSync('adb shell uiautomator dump /sdcard/dump.xml', { stdio: 'pipe' });
    execSync('adb pull /sdcard/dump.xml /tmp/dump.xml', { stdio: 'pipe' });
    return fs.readFileSync('/tmp/dump.xml', 'utf8').slice(0, 8000); // trim for context window
  } catch {
    return null; // emulator may not be running in this context
  }
}

// Step 3 — ask a local model for patches
async function getPatches(failures, hierarchy, pageObjectsDir) {
  // Read all page object files
  const files = fs.readdirSync(pageObjectsDir).filter(f => f.endsWith('.ts'));
  const pageObjectsText = files
    .map(f => `### ${f}\n\`\`\`typescript\n${fs.readFileSync(path.join(pageObjectsDir, f), 'utf8')}\n\`\`\``)
    .join('\n\n');

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: `You are a mobile test automation engineer.

Failing selectors:
${failures.join('\n')}

${hierarchy ? `Current UI hierarchy:\n\`\`\`xml\n${hierarchy}\n\`\`\`` : 'No hierarchy available.'}

Page objects:
${pageObjectsText}

Return a JSON array of patches:
[{ "file": "login.page.ts", "oldSelector": "~old", "newSelector": "~new", "reason": "..." }]
Return only the JSON array — no prose.`,
    }],
  });

  const text = response.choices[0]?.message?.content || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  // Local models (e.g. llama3.1) often emit trailing commas — strip before parsing.
  return JSON.parse(match[0].replace(/,(\s*[\]}])/g, '$1'));
}

// Apply patches to page object files
function applyPatches(patches, pageObjectsDir) {
  let count = 0;
  for (const { file, oldSelector, newSelector, reason } of patches) {
    const filePath = path.join(pageObjectsDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(oldSelector)) continue;

    fs.writeFileSync(filePath, content.replaceAll(oldSelector, newSelector));
    console.log(`Patched ${file}: "${oldSelector}" → "${newSelector}" (${reason})`);
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

  console.log(`Found ${failures.length} failure(s) — fetching hierarchy...`);
  const hierarchy = getPageHierarchy();

  const pageObjectsDir = path.join(__dirname, '../../../droid/pageobjects');
  const patches = await getPatches(failures, hierarchy, pageObjectsDir);

  if (!patches.length) {
    console.log('No patches suggested');
    process.exit(1);
  }

  const applied = applyPatches(patches, pageObjectsDir);
  if (!applied) {
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
