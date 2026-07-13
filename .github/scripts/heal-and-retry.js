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

async function askModelToHeal(failures, uiHierarchy, pageObjects) {
  const pageObjectsText = Object.entries(pageObjects)
    .map(([name, content]) => `### ${name}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join('\n\n');

  const hierarchySection = uiHierarchy
    ? `\n\n## Current UI Hierarchy (ADB dump)\n\`\`\`xml\n${uiHierarchy.slice(0, 8000)}\n\`\`\``
    : '';

  const prompt = `You are a mobile test automation engineer. The following selectors have failed in a WebdriverIO + Appium test run.

## Failing selectors / errors
${failures.map(f => `- ${f.error}\n  ${f.selector}`).join('\n')}
${hierarchySection}

## Page Object files
${pageObjectsText}

For each failing selector, suggest the corrected selector based on the UI hierarchy (if available) or your best judgement.
Return ONLY a JSON array like:
[
  {
    "file": "login.page.ts",
    "oldSelector": "~username_input",
    "newSelector": "~com.saucelabs.mydemoapp.android:id/nameET",
    "reason": "resource-id found in hierarchy dump"
  }
]
Do not include any prose outside the JSON array.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('Model did not return a JSON array — no patches applied');
    return [];
  }

  try {
    // Local models (e.g. llama3.1) often emit trailing commas — strip them
    // before parsing so a valid-but-loose array still applies.
    const cleaned = jsonMatch[0].replace(/,(\s*[\]}])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('Failed to parse model response as JSON:', e.message);
    return [];
  }
}

function applyPatches(patches, pageObjects) {
  let applied = 0;
  for (const patch of patches) {
    const filePath = path.join(PAGE_OBJECTS_DIR, patch.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${patch.file} — skipping patch`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(patch.oldSelector)) {
      console.warn(`Selector "${patch.oldSelector}" not found in ${patch.file} — skipping`);
      continue;
    }
    const updated = content.replaceAll(patch.oldSelector, patch.newSelector);
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Patched ${patch.file}: "${patch.oldSelector}" → "${patch.newSelector}" (${patch.reason})`);
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
  const uiHierarchy = getUiHierarchy();
  const pageObjects = readPageObjects();

  console.log(`Asking ${MODEL} (Ollama) for healing suggestions…`);
  const patches = await askModelToHeal(failures, uiHierarchy, pageObjects);

  if (patches.length === 0) {
    console.log('No patches suggested');
    process.exit(1);
  }

  const applied = applyPatches(patches, pageObjects);
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
