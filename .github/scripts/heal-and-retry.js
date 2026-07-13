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

function extractFailures(log) {
  const lines = log.split('\n');
  const failures = [];
  let currentError = null;

  for (const line of lines) {
    if (line.includes('Error:') || line.includes('NoSuchElementError') || line.includes('TimeoutError')) {
      currentError = line;
    } else if (currentError && line.includes('selector:')) {
      failures.push({ error: currentError, selector: line.trim() });
      currentError = null;
    }
  }

  return failures;
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
