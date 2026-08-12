// @ts-nocheck
/**
 * CH5 — EXECUTOR ("Act" + "Observe")  (WORKSHOP EXERCISE STUB)
 *
 * Take the tool calls the LLM chose, perform them on the device, append each
 * outcome to the conversation, then OBSERVE: capture the new page source so
 * the next Think step reasons about the screen as it is now.
 *
 * Reference implementation: git checkout main -- examples/ch05-execution-loop
 */

import {
  type ChatCompletionMessageParam,
  type ChatCompletionMessageToolCall,
} from 'openai/resources';

import { type ElementAction, type TestResult } from './tools';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Selector resolution (provided) ────────────────────────────────────────────

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
  // TODO(ch5): findElement, then switch on `action`:
  //   click / set_text (click → 500ms keyboard pause → setValue) /
  //   clear_text / scroll_into_view (W3C actions swipe-up).
  // CRITICAL: catch errors and RETURN the failure text instead of throwing —
  // the error message goes back to the LLM; that is what lets the agent
  // self-correct.
  throw new Error('TODO(ch5): implement performElementAction');
};

// ── Act + Observe: a whole batch of tool calls ────────────────────────────────

export const actAndObserve = async (
  toolCalls: ChatCompletionMessageToolCall[],
  contents: ChatCompletionMessageParam[],
  driver: WebdriverIO.Browser,
  actionLog: string[],
): Promise<TestResult | undefined> => {
  // TODO(ch5): for EACH call push exactly one { role: 'tool', tool_call_id,
  // content } message (the protocol requires one response per id):
  //   element_action     → performElementAction(...)
  //   wait               → sleep(seconds), capped at 10
  //   write_test_result  → capture the verdict; tell the model to end
  // Then, if there is no verdict: sleep ~1s for animations and push the fresh
  // driver.getPageSource() as a user message — the observation.
  throw new Error('TODO(ch5): implement actAndObserve');
};
