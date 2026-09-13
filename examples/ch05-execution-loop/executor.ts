/**
 * CH5 — EXECUTOR ("Act" + "Observe")
 *
 * Takes the tool calls the LLM chose, performs them on the device through
 * WebdriverIO/Appium, appends each tool's outcome to the conversation, and
 * finally observes: capture the NEW page source, strip it down to what the
 * model needs, and hand it back so the next Think step reasons about the
 * screen as it is now.
 *
 * Distilled from `bot/ai/agent/app-agent/mobiledriver-loop.ts` and
 * `bot/ai/agent/tools/toolCalls/element-action-call.ts`.
 */

import {
  type ChatCompletionMessageParam,
  type ChatCompletionMessageToolCall,
} from 'openai/resources';

import { type ElementAction, type TestResult } from './tools';

const ELEMENT_TIMEOUT_MS = 2000; // a wrong selector must fail fast — the model retries anyway
const MAX_WAIT_SECONDS = 3;
const SETTLE_MS = 1500; // dialogs and animations after an action (login alert ≈ 1 s)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Observe: page-source compression ─────────────────────────────────────────
// Appium's uiautomator XML is 30-40 KB per screen of this app (≈10k tokens),
// and ~90% of it is boilerplate (`focusable="false" drawing-order="7" …`).
// A local 8B model stops calling tools at that size, and every Think step
// pays to read it. Keep only what the model needs to choose a selector:
// one line per element, identifying + interactive attributes. ≈3% of the size.

const KEEP_ATTRS = ['text', 'content-desc', 'resource-id', 'hint', 'clickable', 'scrollable', 'password', 'checked', 'focused'];
const IDENTIFYING = ['text', 'content-desc', 'resource-id', 'hint', 'clickable', 'scrollable'];

export const compressPageSource = (xml: string): string => {
  const lines: string[] = [];
  for (const [, tag, body] of xml.matchAll(/<([A-Za-z][\w.$]*)\b([^>]*?)\/?>/g)) {
    if (tag === 'hierarchy') continue;
    const attrs = Object.fromEntries([...body.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    const kept: Record<string, string> = {};
    for (const key of KEEP_ATTRS) {
      const value = attrs[key];
      if (value && value !== 'false' && !/^&#\d+;$/.test(value)) kept[key] = value; // skip empty, false, icon glyphs
    }
    if (kept.hint && kept.text === kept.hint) delete kept.text; // placeholder shown as text, not a value
    if (kept['content-desc']) delete kept['resource-id']; // one id per element — the preferred one
    if (attrs.enabled === 'false') kept.enabled = 'false';
    if (!IDENTIFYING.some((key) => key in kept)) continue; // pure layout container — nothing to act on
    const shortTag = tag.slice(tag.lastIndexOf('.') + 1);
    const attrList = Object.entries(kept).map(([key, value]) => `${key}="${value}"`).join(' ');
    lines.push(`<${shortTag} ${attrList}/>`);
  }
  return lines.join('\n');
};

/** The observation the model reasons about: the current screen, compressed. */
export const observe = async (driver: WebdriverIO.Browser): Promise<string> =>
  compressPageSource(await driver.getPageSource());

// ── Selector resolution ───────────────────────────────────────────────────────
// The LLM answers with a plain identifier string; map it onto a WDIO selector.
// Explicit forms win; a bare value is tried as accessibility id, then
// resource-id, then visible text — the same order the tool description teaches.

const SELECTOR_HINT =
  'Use a value from the page source: ~content-desc (preferred), text=Visible text, or a resource-id.';

const candidateSelectors = (identifier: string): string[] => {
  const id = identifier.trim().replace(/^~/, ''); // models sprinkle the ~ marker everywhere — take it off first
  if (id.startsWith('/')) return [id]; // XPath as-is
  // "text=LOGIN", "resource-id=android:id/button1", "content-desc=Login" — explicit forms
  const kv = id.match(/^([\w-]+)\s*=\s*(.*)$/);
  if (kv) {
    const value = kv[2].replace(/^["']|["']$/g, '');
    if (/^text$/i.test(kv[1])) return [`android=new UiSelector().text("${value}")`];
    if (/id$/i.test(kv[1])) return [`android=new UiSelector().resourceId("${value}")`];
    if (/desc|accessibility/i.test(kv[1])) return [`~${value}`];
  }
  if (id.includes(':id/')) return [`android=new UiSelector().resourceId("${id}")`];
  // Bare value: accessibility id first (the preferred form), then resource-id, then visible text.
  return [`~${id}`, `android=new UiSelector().resourceId("${id}")`, `android=new UiSelector().text("${id}")`];
};

const findElement = async (driver: WebdriverIO.Browser, identifier: string) => {
  const candidates = candidateSelectors(identifier);
  let selector = candidates[0];
  for (const candidate of candidates) {
    if (await driver.$(candidate).isExisting()) {
      selector = candidate;
      break;
    }
  }
  const element = driver.$(selector);
  await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUT_MS });
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
        await driver.hideKeyboard().catch(() => undefined); // it would cover the tabs/buttons below
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
      default:
        throw new Error(`Unknown action "${action}"`);
    }
    return `Action ${action} performed on element ${element_identifier}`;
  } catch (error) {
    // The failure message goes back to the LLM — this is what lets the agent
    // self-correct: it reads the error, re-reads the DOM, and tries another way.
    const reason = error instanceof Error ? error.message : String(error);
    return `Failed to perform ${action} on ${element_identifier}: ${reason}. ${SELECTOR_HINT}`;
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
        const seconds = Math.min(Number(args.seconds) || 1, MAX_WAIT_SECONDS);
        await sleep(seconds * 1000);
        outcome = `Waited for ${seconds} seconds`;
        break;
      }
      case 'write_test_result':
        // Guard: a verdict only counts on its own, after the model has SEEN
        // the outcome. Small models like to batch "click, click, success!" —
        // blind, before a single action ran. Reject that and make it look.
        if (toolCalls.length > 1) {
          outcome =
            'Rejected: write_test_result must be the ONLY call in a step. ' +
            'Act first, read the new page source, then report what you actually see.';
          break;
        }
        // Local models send "True"/"false" as strings — normalise, do not trust truthiness.
        const success = /^true$/i.test(String(args.success));
        if (success && actionLog[actionLog.length - 1]?.startsWith('Failed')) {
          outcome =
            'Rejected: your last action failed, so the goal cannot have been reached. ' +
            'Read the page source and act, or report success=false.';
          break;
        }
        verdict = { success, message: String(args.message ?? '') };
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
    await sleep(SETTLE_MS);
    contents.push({ role: 'user', content: `Here is the page source:\n${await observe(driver)}` });
  }

  return verdict;
};
