#!/usr/bin/env node
'use strict';

/**
 * CH9 — FAILURE ANALYSIS  (WORKSHOP EXERCISE STUB)
 *
 * On a red build: read appium.log, ask a local model for a structured root
 * cause, open a GitHub issue. The GitHub plumbing is provided; you implement
 * the log trimming and the analysis prompt.
 *
 * Run locally (needs an appium.log): node examples/ch09-agent-ci/analyse-failures.js
 * Reference implementation: git checkout main -- examples/ch09-agent-ci
 */

const fs = require('fs');
const https = require('https');
const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

const LOG_PATH = 'appium.log';
const MAX_LOG_CHARS = 12000; // fits comfortably in the local model's context

// Read and trim the log so it fits in the prompt
function readLog(logPath) {
  // TODO(ch9): return null if missing; otherwise return the LAST
  // MAX_LOG_CHARS characters (failures are at the end), prefixed with
  // '...(truncated)\n' when trimmed.
  throw new Error('TODO(ch9): implement readLog');
}

// Ask a local model to produce a structured failure analysis
async function analyseLog(log) {
  // TODO(ch9): one chat completion. Ask for a GitHub issue body in markdown
  // with EXACTLY these sections — ## Summary (one sentence, root cause),
  // ## Failing tests (bullets), ## Error details (key errors, no stack
  // traces), ## Suggested fix (1–3 actionable steps) — under 400 words.
  throw new Error('TODO(ch9): implement analyseLog');
}

// Open a GitHub issue using the REST API (provided — degrades to stdout)
function openIssue(title, body) {
  return new Promise((resolve, reject) => {
    const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
    const token = process.env.GH_TOKEN;

    if (!repo || !token) {
      console.log('GITHUB_REPOSITORY or GH_TOKEN not set — skipping issue creation');
      console.log('\n--- Issue body ---\n', body);
      resolve(null);
      return;
    }

    const payload = JSON.stringify({ title, body, labels: ['ci-failure', 'automated'] });
    const [owner, repoName] = repo.split('/');

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repoName}/issues`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'droid-detective-ci',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.html_url) {
          console.log(`Issue created: ${parsed.html_url}`);
          resolve(parsed.html_url);
        } else {
          reject(new Error(`Failed to create issue: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const log = readLog(LOG_PATH);
  if (!log) {
    console.log('No appium.log found — nothing to analyse');
    process.exit(0);
  }

  console.log('Analysing failures...');
  const body = await analyseLog(log);

  const title = `CI failure — ${new Date().toISOString().slice(0, 10)}`;
  await openIssue(title, body);
}

main().catch(err => { console.error(err); process.exit(1); });
