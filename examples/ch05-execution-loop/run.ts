/**
 * CH5 — RUNNER
 *
 * Connects to a local Appium server + Android emulator, installs the demo
 * APK, and hands a plain-English goal to the agentic loop.
 *
 * Prerequisites (Chapter 3):
 *   - emulator running (`emulator-5554`)
 *   - `apps/demo.apk` in place
 *   - an LLM endpoint (see llm.ts for env vars)
 *
 * Run:
 *   pnpm appium              # terminal 1
 *   pnpm exec ts-node examples/ch05-execution-loop/run.ts   # terminal 2
 */

import { join } from 'path';

import { remote } from 'webdriverio';

import { runAgentLoop } from './loop';

const GOAL =
  process.argv[2] ??
  'Log in with email alice@example.com and password 10203040, then verify the login succeeded.';

const SYSTEM_PROMPT = `You are a mobile QA agent testing an Android demo shopping app.
You are given a goal and, after every action, the current page source (uiautomator XML).
Work step by step towards the goal:
- Read the page source to find elements. Prefer accessibility ids (content-desc → ~value).
- Copy attribute values VERBATIM from the XML — never invent selectors.
- Use element_action to interact, wait when the UI needs to settle.
- When the goal is reached (or clearly impossible), call write_test_result exactly once.`;

async function main() {
  const driver = await remote({
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'warn',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'emulator-5554',
      'appium:app': join(__dirname, '../../apps/demo.apk'),
      'appium:newCommandTimeout': 240,
      'appium:autoGrantPermissions': true,
    },
  });

  try {
    await driver.pause(2000); // let the app draw its first screen
    const result = await runAgentLoop(GOAL, SYSTEM_PROMPT, driver);
    process.exitCode = result.success ? 0 : 1;
  } finally {
    await driver.deleteSession();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
