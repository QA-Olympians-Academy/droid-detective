#!/usr/bin/env node
'use strict';

/**
 * Reads changed page-object files in a PR, asks a local Ollama model
 * to review the selectors for brittleness, then posts a PR comment.
 * No cloud API key required.
 */

const { execSync } = require('child_process');
const { OpenAI } = require('openai');

// Ollama exposes an OpenAI-compatible endpoint; no real key is needed.
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
});
const MODEL = process.env.LLM_MODEL || 'llama3.1';

const REPO = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;
const BASE_SHA = process.env.BASE_SHA;
const HEAD_SHA = process.env.HEAD_SHA;

function getChangedPageObjects() {
  const output = execSync(
    `git diff --name-only ${BASE_SHA} ${HEAD_SHA} -- 'droid/pageobjects/**'`,
    { encoding: 'utf8' },
  ).trim();

  if (!output) return [];
  return output.split('\n').filter(Boolean);
}

function getDiff(files) {
  if (files.length === 0) return '';
  return execSync(
    `git diff ${BASE_SHA} ${HEAD_SHA} -- ${files.map(f => `'${f}'`).join(' ')}`,
    { encoding: 'utf8' },
  );
}

async function reviewWithModel(diff) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `You are reviewing changes to WebdriverIO page-object files for an Android app tested with Appium + UIAutomator2.

Here is the diff:
\`\`\`diff
${diff.slice(0, 10000)}
\`\`\`

Review the changed selectors and provide feedback on:
1. **Brittle selectors** — index-based XPaths, generated IDs, position-dependent selectors
2. **Best practice issues** — prefer accessibility IDs (~) or resource-IDs over XPath where possible
3. **Suggestions** — specific improvements for any brittle selectors found

Format as a GitHub PR comment (markdown). Be concise. If all selectors look good, say so briefly.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No review available';
}

function postPRComment(body) {
  if (!REPO || !PR_NUMBER) {
    console.log('GITHUB_REPOSITORY or PR_NUMBER not set — printing review instead:\n', body);
    return;
  }

  const escaped = body.replace(/'/g, "'\\''");
  execSync(
    `gh pr comment ${PR_NUMBER} --repo "${REPO}" --body '🤖 **Locator Review**\n\n${escaped}'`,
    { stdio: 'inherit', env: { ...process.env } },
  );
}

async function main() {
  console.log('🔍 Reviewing changed locators in PR…');

  const files = getChangedPageObjects();
  if (files.length === 0) {
    console.log('No page-object files changed — skipping review');
    process.exit(0);
  }

  console.log('Changed files:', files);
  const diff = getDiff(files);

  if (!diff.trim()) {
    console.log('Diff is empty — skipping review');
    process.exit(0);
  }

  const review = await reviewWithModel(diff);
  console.log('Review:\n', review);
  postPRComment(review);
  console.log('Done');
}

main().catch(err => {
  console.error('review-locators error:', err);
  process.exit(1);
});
