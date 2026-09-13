/**
 * CH5 — RUNNER
 *
 * Connects to a local Appium server + Android emulator, installs the demo
 * APK, and hands a plain-English goal to the agentic loop.
 *
 * Prerequisites (Chapter 3):
 *   - emulator running (`emulator-5554`)
 *   - `apps/demo.apk` in place
 *   - an LLM endpoint (see llm.ts for env vars — defaults to local Ollama)
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

// One action per step is deliberate: the model can only see the screen as it
// is NOW. Left free, small models plan the whole flow blind — invented ids,
// then a "success" verdict before anything ran.
const SYSTEM_PROMPT = `You are a mobile QA agent testing an Android demo app.
You get a goal, then after every action the current page source: one line per element, for example
  <Button content-desc="Login" clickable="true"/>
  <EditText content-desc="input-email" clickable="true" hint="Email"/>
You can only see the screen as it is NOW. Rules:
1. Call element_action ONCE per step, then read the new page source before choosing the next action.
2. element_identifier is the element's content-desc value with a ~ prefix, copied VERBATIM: ~Login, ~input-email.
   Only if the element has no content-desc, use text=<its text> or its resource-id. Never invent names.
3. If an action fails, that element is not on this screen — pick a DIFFERENT one from the page source.
4. Call write_test_result ALONE in its own step, only when the page source shows the goal was reached
   (e.g. a success message) or it is clearly impossible. Describe what you see.
Example: to type into <EditText content-desc="input-email" .../> call
  element_action {"element_identifier": "~input-email", "action": "set_text", "value": "alice@example.com"}`;

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
    console.log(`\n[ result ] ${result.success ? 'PASS' : 'FAIL'} — ${result.message}`);
    process.exitCode = result.success ? 0 : 1;
  } finally {
    await driver.deleteSession();
  }
}

main().catch((err) => {
  console.error(err);
  if (/ECONNREFUSED|fetch failed|Connection error/i.test(String(err))) {
    console.error(
      '\nConnection refused — is Appium listening on :4723 (`pnpm appium`) and the LLM endpoint up ' +
        '(default: Ollama on :11434, `ollama serve`)?',
    );
  }
  process.exit(1);
});
