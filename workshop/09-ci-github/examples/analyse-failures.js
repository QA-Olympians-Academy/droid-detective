#!/usr/bin/env node
'use strict';

/**
 * Failure analysis script — workshop example.
 *
 * Reads appium.log, asks Claude to summarise root causes,
 * and opens a structured GitHub issue via the REST API.
 *
 * The production version is at .github/scripts/analyse-failures.js
 */

const fs = require('fs');
const https = require('https');
const Anthropic = require('@anthropic-ai/sdk').default;

const LOG_PATH = 'appium.log';
const MAX_LOG_CHARS = 12000; // fits comfortably in Claude's context

// Read and trim the log so it fits in the prompt
function readLog(logPath) {
  if (!fs.existsSync(logPath)) return null;
  const full = fs.readFileSync(logPath, 'utf8');
  // Take the last MAX_LOG_CHARS — failures are at the end
  return full.length > MAX_LOG_CHARS
    ? '...(truncated)\n' + full.slice(-MAX_LOG_CHARS)
    : full;
}

// Ask Claude to produce a structured failure analysis
async function analyseLog(log) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a mobile test automation engineer analysing a CI failure.

Appium log:
\`\`\`
${log}
\`\`\`

Produce a GitHub issue body in markdown with exactly these sections:

## Summary
One sentence: what failed and the most likely root cause.

## Failing tests
Bullet list of test names that failed.

## Error details
The key error messages (selector not found, timeout, assertion failure) — not the full stack trace.

## Suggested fix
1–3 concrete, actionable steps an engineer can take to resolve this.

Keep the total response under 400 words.`,
    }],
  });

  return response.content[0].text;
}

// Open a GitHub issue using the REST API
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
