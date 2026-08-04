#!/usr/bin/env node
'use strict';

/**
 * PR locator review script — workshop example.
 *
 * On a pull request, diffs changed page object files,
 * asks a local model to flag brittle selectors, and posts a PR comment.
 *
 * The production version is at .github/scripts/review-locators.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

const PAGE_OBJECTS_GLOB = 'droid/pageobjects/*.ts';

// Get the diff of page object files changed in this PR
function getChangedPageObjects() {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;

  if (!base || !head) {
    // Local fallback: show unstaged changes
    try {
      return execSync(`git diff HEAD -- ${PAGE_OBJECTS_GLOB}`, { encoding: 'utf8' });
    } catch {
      return null;
    }
  }

  try {
    return execSync(
      `git diff ${base}..${head} -- ${PAGE_OBJECTS_GLOB}`,
      { encoding: 'utf8' }
    );
  } catch {
    return null;
  }
}

// Ask a local model to review the changed selectors
async function reviewSelectors(diff) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: `You are a mobile test automation engineer reviewing changed selectors in a pull request.

Diff of changed page objects:
\`\`\`diff
${diff}
\`\`\`

Review the changed selectors for brittleness. For each added or modified selector, flag it if it matches any of these anti-patterns:

- Index-based XPath: \`//LinearLayout[2]\`, \`//*[@index="3"]\`
- Structural XPath: \`//android.widget.Button[1]\`
- Bounds-based: \`bounds=[...]\`
- Generated resource ID: contains a hash (e.g. \`id/btn_a3f2c9\`)
- Text-based without a11y ID fallback: \`//*[@text="..."]\`
- Empty content-desc: \`content-desc=""\`

For each flag, write:
- The selector
- Why it is brittle
- The recommended replacement (or "add contentDescription to the app")

If no selectors are brittle, write: "✅ All changed selectors look good."

Format as markdown. Keep the response under 300 words.`,
    }],
  });

  return response.choices[0]?.message?.content || '';
}

// Post a review comment on the PR
function postPrComment(body) {
  return new Promise((resolve, reject) => {
    const repo = process.env.GITHUB_REPOSITORY;
    const token = process.env.GH_TOKEN;
    const prNumber = process.env.PR_NUMBER;

    if (!repo || !token || !prNumber) {
      console.log('Missing env vars — printing review to stdout:\n');
      console.log(body);
      resolve(null);
      return;
    }

    const payload = JSON.stringify({
      body: `## 🤖 Locator Review\n\n${body}`,
    });
    const [owner, repoName] = repo.split('/');

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repoName}/issues/${prNumber}/comments`,
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
          console.log(`Comment posted: ${parsed.html_url}`);
          resolve(parsed.html_url);
        } else {
          reject(new Error(`Failed to post comment: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const diff = getChangedPageObjects();

  if (!diff || diff.trim() === '') {
    console.log('No page object changes in this PR — skipping locator review');
    process.exit(0);
  }

  console.log('Reviewing changed locators...');
  const review = await reviewSelectors(diff);
  await postPrComment(review);
}

main().catch(err => { console.error(err); process.exit(1); });
