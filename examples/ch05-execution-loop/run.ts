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

// Written like a test step on purpose. "Log in with …" alone made the local
// models tap the *Login* tab toggle forever; naming the button and the expected
// message is what a test case would do anyway.
const GOAL =
  process.argv[2] ??
  'Open the Login tab, log in with email alice@example.com and password 10203040 by pressing the LOGIN button, ' +
    'then verify that the "You are logged in!" message is shown.';

// The FIRST line matters most for a small model. With the one-call rule up
// front, llama3.1 answers step 1 with one tool call in ~4 s; buried further
// down, it plans the whole flow blind — five calls, 700+ tokens, 30+ s — and
// invents ids for screens it has not seen yet.
const SYSTEM_PROMPT = `Answer with EXACTLY ONE tool call per step — never more. You act one step at a time and see the screen again after each action.

You are a mobile QA agent testing an Android demo app.
You get a goal, then after every action the current page source: one line per element, for example
  <Button content-desc="Settings" clickable="true" label="Settings"/>
  <EditText content-desc="input-username" hint="Username" clickable="true"/>
You can only see the screen as it is NOW. Rules:
1. element_identifier is the element's content-desc value with a ~ prefix, copied VERBATIM: ~Settings, ~input-username.
   Only if the element has no content-desc, use text=<its text> or its resource-id. Never invent names.
2. Before pressing a button, every value the goal mentions must already be typed into its field (value="" means empty).
3. If an action fails, that element is not on this screen — pick a DIFFERENT one from the page source.
4. Call write_test_result ALONE in its own step, only when the page source shows the goal was reached
   (e.g. a success message) or it is clearly impossible. Describe what you see.
Example: to type into <EditText content-desc="input-username" hint="Username" .../> call
  element_action {"element_identifier": "~input-username", "action": "set_text", "value": "jane"}`;

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
