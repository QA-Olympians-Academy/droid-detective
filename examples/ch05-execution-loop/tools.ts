/**
 * CH5 — TOOL DEFINITIONS
 *
 * The "Act" vocabulary. These schemas are what the LLM sees: on every Think
 * step it may answer with one or more of these tool calls instead of text.
 * A tool definition is a contract — name, parameters, and (crucially) the
 * description that teaches the model WHEN and HOW to use it.
 *
 * Distilled from the production set in `bot/ai/agent/tools/`.
 */

import { type ChatCompletionTool } from 'openai/resources';

export type ElementAction = {
  element_identifier: string;
  action: 'click' | 'set_text' | 'clear_text' | 'scroll_into_view';
  value?: string;
};

export type TestResult = { success: boolean; message: string };

export const elementActionTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'element_action',
    description:
      'Perform ONE action on ONE element of the mobile app, then wait for the new page source. ' +
      'Prioritize BUTTONS, INPUTS, and TEXT FIELDS when possible.',
    parameters: {
      type: 'object',
      properties: {
        element_identifier: {
          type: 'string',
          description:
            'How to name the element, copied VERBATIM from the page source:\n' +
            '1. PREFERRED: the content-desc value with a ~ prefix, e.g. `~input-email`\n' +
            '2. if it has no content-desc: its visible text as `text=LOGIN`\n' +
            '3. if neither: its resource-id, e.g. `android:id/button1`\n' +
            '4. LAST RESORT: XPath, e.g. `//android.widget.Button[@text="OK"]`.\n' +
            'Never invent names — if it is not in the page source, it does not exist.',
        },
        action: {
          type: 'string',
          description: 'The action to perform on the element',
          enum: ['click', 'set_text', 'clear_text', 'scroll_into_view'],
        },
        value: {
          type: 'string',
          description: 'The value to set on the element (required for set_text)',
        },
      },
      required: ['element_identifier', 'action'],
    },
  },
};

export const waitTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'wait',
    description: 'Wait 1-3 seconds for the UI to settle (dialogs, animations) before the next look.',
    parameters: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'The number of seconds to wait (max 3)' },
      },
    },
  },
};

export const writeTestResultTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_test_result',
    description:
      'Report the final verdict. Call it ALONE in its own step, only after the page source shows ' +
      'the outcome (e.g. a success message or the expected screen). Calling this ends the test.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'What you see on screen that proves the verdict' },
        success: { type: 'boolean', description: 'Whether the goal was reached' },
      },
      required: ['message', 'success'],
    },
  },
};

export const LoopTools: ChatCompletionTool[] = [elementActionTool, waitTool, writeTestResultTool];
