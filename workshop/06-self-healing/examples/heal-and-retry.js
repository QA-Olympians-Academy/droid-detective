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

// Step 1 — parse the log
function extractFailedSelectors(logPath) {
  const log = fs.readFileSync(logPath, 'utf8');
  const failures = [];

  for (const line of log.split('\n')) {
    if (line.includes('NoSuchElementError') || line.includes('TimeoutError')) {
      failures.push(line.trim());
    }
  }

  return failures;
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
  return match ? JSON.parse(match[0]) : [];
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
