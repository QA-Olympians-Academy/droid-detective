#!/usr/bin/env node
'use strict';

/**
 * CH9 — PR LOCATOR REVIEW  (WORKSHOP EXERCISE STUB)
 *
 * On a pull request: diff the changed page objects, ask a local model to flag
 * brittle selectors, post the review as a PR comment. The GitHub plumbing is
 * provided; you implement the diff collection and the review prompt.
 *
 * Run locally (stage a page-object change first): node examples/ch09-agent-ci/review-locators.js
 * Reference implementation: git checkout main -- examples/ch09-agent-ci
 */

const { execSync } = require('child_process');
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
  // TODO(ch9): in CI, diff BASE_SHA..HEAD_SHA restricted to
  // PAGE_OBJECTS_GLOB; locally (no env vars) fall back to `git diff HEAD`.
  // Return null when git fails.
  throw new Error('TODO(ch9): implement getChangedPageObjects');
}

// Ask a local model to review the changed selectors
async function reviewSelectors(diff) {
  // TODO(ch9): one chat completion. The prompt must:
  //   - include the diff in a ```diff fence,
  //   - name the anti-patterns to flag (index-based XPath, structural XPath,
  //     bounds-based, generated/hashed resource ids, text-only selectors,
  //     empty content-desc),
  //   - ask for selector + why brittle + recommended replacement,
  //   - request markdown under 300 words, and a ✅ line when nothing is wrong.
  throw new Error('TODO(ch9): implement reviewSelectors');
}

// Post a review comment on the PR (provided — degrades to stdout locally)
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

    const payload = JSON.stringify({ body: `## 🤖 Locator Review\n\n${body}` });
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
