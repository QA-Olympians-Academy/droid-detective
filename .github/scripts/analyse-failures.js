#!/usr/bin/env node
'use strict';

/**
 * Reads appium.log, detects locators that genuinely failed, and — only when
 * there are broken selectors — asks a local Ollama model to summarise them and
 * opens a GitHub issue. No cloud API key required.
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

// Map a UiAutomator2 (strategy, value) pair to the WDIO selector form used in
// the page objects (`~Foo` for accessibility ids, everything else verbatim).
function toWdioSelector(strategy, value) {
  if (strategy === 'accessibility id') return '~' + value;
  return value;
}

// Parse appium.log for locators that genuinely failed. Each lookup is a request
// line carrying the selector, then an outcome line (200 = found, 404 = not):
//   --> POST /session/<sid>/element {"using":"accessibility id","value":"Carousel"}
//   <-- POST /session/<sid>/element 404
// A selector is a real failure only if it NEVER succeeded — this skips the
// transient 404s while waitForDisplayed polls. Requests pair to responses by
// session id (spec workers interleave in one log).
function extractFailedSelectors(log) {
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
    if (rs && pending[rs[1]]) {
      const p = pending[rs[1]];
      const key = `${p.strategy}|${p.value}`;
      if (rs[2] === '200') succeeded.add(key);
      else failed.set(key, p);
      delete pending[rs[1]];
    }
  }

  return [...failed.entries()]
    .filter(([key]) => !succeeded.has(key))
    .map(([, p]) => toWdioSelector(p.strategy, p.value));
}

async function analyseWithModel(selectors, log) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `You are a mobile test automation engineer. A CI run failed because these
locators could not be found on screen:

${selectors.map(s => `- ${s}`).join('\n')}

Relevant Appium log tail:
\`\`\`
${log}
\`\`\`

Provide a concise GitHub issue body (markdown) that includes:
1. **Summary** — one sentence: which selectors broke and the likely cause (renamed / removed / screen changed)
2. **Broken selectors** — the bullet list above
3. **Suggested fix** — how to recrawl the screen and update the page objects

Focus only on the broken selectors. Use clear headings. Keep it under 300 words.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No analysis available';
}

function openGitHubIssue(selectors, body) {
  if (!REPO) {
    console.log('GITHUB_REPOSITORY not set — printing issue body instead:\n', body);
    return;
  }

  const title = `[CI] Broken selectors: ${selectors.join(', ').slice(0, 80)}`;
  const escaped = body.replace(/'/g, "'\\''");

  execSync(
    `gh issue create --repo "${REPO}" --title "${title}" --body '${escaped}'`,
    { stdio: 'inherit', env: { ...process.env } },
  );
}

async function main() {
  console.log('📋 Analysing test failures…');
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No appium.log found — skipping analysis');
    process.exit(0);
  }
  const fullLog = fs.readFileSync(LOG_FILE, 'utf8');

  const selectors = extractFailedSelectors(fullLog);
  if (selectors.length === 0) {
    console.log('No broken selectors detected — not opening an issue');
    process.exit(0);
  }
  console.log(`Found ${selectors.length} broken selector(s): ${selectors.join(', ')}`);

  const logTail = fullLog.length > 15000 ? '...[truncated]\n' + fullLog.slice(-15000) : fullLog;
  const analysis = await analyseWithModel(selectors, logTail);
  console.log('Analysis:\n', analysis);
  openGitHubIssue(selectors, analysis);
  console.log('Done');
}

main().catch(err => {
  console.error('analyse-failures error:', err);
  process.exit(1);
});
