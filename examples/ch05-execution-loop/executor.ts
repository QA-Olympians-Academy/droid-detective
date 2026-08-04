/**
 * CH5 — EXECUTOR ("Act" + "Observe")
 *
 * Takes the tool calls the LLM chose, performs them on the device through
 * WebdriverIO/Appium, appends each tool's outcome to the conversation, and
 * finally observes: capture the NEW page source and hand it back so the next
 * Think step reasons about the screen as it is now.
 *
 * Distilled from `bot/ai/agent/app-agent/mobiledriver-loop.ts` and
 * `bot/ai/agent/tools/toolCalls/element-action-call.ts`.
 */

import {
  type ChatCompletionMessageParam,
  type ChatCompletionMessageToolCall,
} from 'openai/resources';

import { type ElementAction, type TestResult } from './tools';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Selector resolution ───────────────────────────────────────────────────────
// The LLM answers with a plain identifier string; map it onto a WDIO selector.

const findElement = async (driver: WebdriverIO.Browser, identifier: string) => {
  let selector: string;
  if (identifier.startsWith('//') || identifier.startsWith('/')) {
    selector = identifier; // XPath as-is
  } else if (identifier.includes(':id/')) {
    selector = `android=new UiSelector().resourceId("${identifier}")`;
  } else {
    selector = identifier.startsWith('~') ? identifier : `~${identifier}`; // accessibility id
  }
  const element = driver.$(selector);
  await element.waitForDisplayed({ timeout: 5000 });
  return element;
};

// ── Act: one element_action ───────────────────────────────────────────────────

export const performElementAction = async (
  driver: WebdriverIO.Browser,
  { element_identifier, action, value }: ElementAction,
): Promise<string> => {
  try {
    const element = await findElement(driver, element_identifier);

    switch (action) {
      case 'click':
        await element.click();
        break;
      case 'set_text':
        if (!value) throw new Error('Value is required for set_text');
        await element.click();
        await sleep(500); // keyboard animation
        await element.setValue(value);
        break;
      case 'clear_text':
        await element.clearValue();
        break;
      case 'scroll_into_view': {
        // W3C actions swipe-up, same gesture as BasePage.swipe in droid/pageobjects.
        const { width, height } = await driver.getWindowSize();
        await driver
          .action('pointer', { parameters: { pointerType: 'touch' } })
          .move({ x: width / 2, y: height * 0.7 })
          .down()
          .pause(100)
          .move({ duration: 500, x: width / 2, y: height * 0.3 })
          .up()
          .perform();
        break;
      }
    }
    return `Action ${action} performed on element ${element_identifier}`;
  } catch (error) {
    // The failure message goes back to the LLM — this is what lets the agent
    // self-correct: it reads the error, re-reads the DOM, and tries another way.
    return `Failed to perform ${action} on ${element_identifier}: ${error}`;
  }
};

// ── Act + Observe: a whole batch of tool calls ────────────────────────────────

/**
 * Executes every tool call, pushing one `role: 'tool'` message per call (the
 * protocol requires exactly one response per tool_call_id), then appends the
 * fresh page source as the observation for the next Think step.
 *
 * Returns the test verdict if the model called `write_test_result`.
 */
export const actAndObserve = async (
  toolCalls: ChatCompletionMessageToolCall[],
  contents: ChatCompletionMessageParam[],
  driver: WebdriverIO.Browser,
  actionLog: string[],
): Promise<TestResult | undefined> => {
  let verdict: TestResult | undefined;

  for (const call of toolCalls) {
    if (call.type !== 'function') continue;
    const args = JSON.parse(call.function.arguments || '{}');
    let outcome: string;

    switch (call.function.name) {
      case 'element_action':
        outcome = await performElementAction(driver, args as ElementAction);
        break;
      case 'wait': {
        const seconds = Math.min(Number(args.seconds) || 1, 10);
        await sleep(seconds * 1000);
        outcome = `Waited for ${seconds} seconds`;
        break;
      }
      case 'write_test_result':
        verdict = args as TestResult;
        outcome = `Result recorded (${verdict.success ? '✅' : '❌'}). End the test now.`;
        break;
      default:
        outcome = `Unknown tool: ${call.function.name}`;
    }

    contents.push({ role: 'tool', tool_call_id: call.id, content: outcome });
    actionLog.push(outcome);
  }

  // Observe — the new screen state becomes the next user message.
  if (!verdict) {
    await sleep(1000); // let animations settle
    contents.push({ role: 'user', content: await driver.getPageSource() });
  }

  return verdict;
};
