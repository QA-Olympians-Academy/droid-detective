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
      'Perform an action on an element in the mobile app. ' +
      'Prioritize BUTTONS, INPUTS, and TEXT FIELDS when possible.',
    parameters: {
      type: 'object',
      properties: {
        element_identifier: {
          type: 'string',
          description:
            'Element selector, by priority:\n' +
            '1. PREFERRED: accessibility id when available (e.g. `~login-button`)\n' +
            '2. GOOD: resource-id XPath (e.g. `//*[@resource-id="btn_login"]`)\n' +
            '3. GOOD: text XPath (e.g. `//*[contains(@text, "Submit")]`)\n' +
            '4. LAST RESORT: class-based XPath.\n' +
            'Copy attribute values VERBATIM from the page source — never invent them.',
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
    },
  },
};

export const waitTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'wait',
    description: 'Wait for a specified number of seconds (default 1-3) for the UI to settle.',
    parameters: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'The number of seconds to wait' },
      },
    },
  },
};

export const writeTestResultTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_test_result',
    description:
      'Report the final verdict once the goal is reached or clearly impossible. ' +
      'Calling this ends the test.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The test result message' },
        success: { type: 'boolean', description: 'Whether the test was successful' },
      },
    },
  },
};

export const LoopTools: ChatCompletionTool[] = [elementActionTool, waitTool, writeTestResultTool];
