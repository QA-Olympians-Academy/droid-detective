#!/usr/bin/env node
'use strict';

/**
 * Reads changed page-object files in a PR, asks Claude to review
 * the selectors for brittleness, then posts a PR comment.
 */

const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk').default;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function reviewWithClaude(diff) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
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

  return message.content[0].type === 'text' ? message.content[0].text : 'No review available';
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

  const review = await reviewWithClaude(diff);
  console.log('Review:\n', review);
  postPRComment(review);
  console.log('Done');
}

main().catch(err => {
  console.error('review-locators error:', err);
  process.exit(1);
});
