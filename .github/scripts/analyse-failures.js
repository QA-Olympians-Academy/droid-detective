#!/usr/bin/env node
'use strict';

/**
 * Reads appium.log, asks a local Ollama model to summarise the root
 * causes, then opens a GitHub issue with the analysis. No cloud API
 * key required.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { OpenAI } = require('openai');

// Ollama exposes an OpenAI-compatible endpoint; no real key is needed.
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

const LOG_FILE = 'appium.log';
const REPO = process.env.GITHUB_REPOSITORY;

function readLog() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No appium.log found — skipping analysis');
    process.exit(0);
  }
  // Trim to last 15 000 chars to stay within token budget
  const full = fs.readFileSync(LOG_FILE, 'utf8');
  return full.length > 15000 ? '...[truncated]\n' + full.slice(-15000) : full;
}

async function analyseWithModel(log) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `You are a mobile test automation engineer analysing a failed CI run.

Here is the Appium log:
\`\`\`
${log}
\`\`\`

Provide a concise GitHub issue body (markdown) that includes:
1. **Summary** — one sentence root cause
2. **Failing tests** — bullet list of test names
3. **Error details** — the key error messages
4. **Suggested fix** — actionable next steps

Use clear headings. Keep it under 400 words.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No analysis available';
}

function openGitHubIssue(body) {
  if (!REPO) {
    console.log('GITHUB_REPOSITORY not set — printing issue body instead:\n', body);
    return;
  }

  const title = `[CI] Android test failures — ${new Date().toISOString().slice(0, 10)}`;
  const escaped = body.replace(/'/g, "'\\''");

  execSync(
    `gh issue create --repo "${REPO}" --title "${title}" --body '${escaped}' --label "bug,ci"`,
    { stdio: 'inherit', env: { ...process.env } },
  );
}

async function main() {
  console.log('📋 Analysing test failures…');
  const log = readLog();
  const analysis = await analyseWithModel(log);
  console.log('Analysis:\n', analysis);
  openGitHubIssue(analysis);
  console.log('Done');
}

main().catch(err => {
  console.error('analyse-failures error:', err);
  process.exit(1);
});
