/* eslint-disable @typescript-eslint/no-floating-promises */

import { type ElementAction } from '@Ai/Bot/Agent/tools/element-action';
import { mobileElementActionCall } from '@Ai/Bot/Agent/tools/toolCalls/element-action-call';
import { logger } from '@Ai/Bot/Utils/logger';
import { type ChatCompletionMessageParam, type ChatCompletionMessageToolCall } from 'openai/resources';

import { type KeyboardAction } from '../tools/keyboard-action';
import { mobileKeyboardActionCall } from '../tools/toolCalls/keyboard-action-call';

/**
 * Executes a WebDriver loop that processes tool function calls from an AI agent.
 *
 * This function iterates through an array of function calls, executes the appropriate actions
 * based on the function name (element_action, write_error, write_test_result, wait), and
 * updates the conversation contents with tool responses. It also captures the current page
 * source and screenshot after all function calls are processed.
 *
 * @param functionCalls - Array of tool function calls to be executed
 * @param contents - Array of chat completion messages that will be updated with tool responses
 * @param driver - WebdriverIO Browser instance used to interact with the web application
 * @param actionSteps - Array of action step descriptions that will be populated with executed actions
 * @returns Promise resolving to the updated contents array with tool responses and page state
 *
 * @example
 * ```typescript
 * const updatedContents = await executeMobileDriverLoop(
 *   functionCalls,
 *   contents,
 *   driver,
 *   actionSteps
 * );
 * ```
 */
export const executeMobileDriverLoop = async (
  functionCalls: ChatCompletionMessageToolCall[],
  contents: ChatCompletionMessageParam[],
  driver: WebdriverIO.Browser,
  actionSteps: string[],
) => {
  logger.debug('[ executeMobileDriverLoop ] with', functionCalls.length, 'function calls');
  for (const functionCall of functionCalls) {
    if (functionCall.type !== 'function') continue;
    logger.debug('[ executeMobileDriverLoop ] function call', functionCall.function.name);
    if (functionCall.function.name === 'element_action') {
      const response = await mobileElementActionCall(
        JSON.parse(functionCall.function.arguments) as ElementAction,
        driver,
      );

      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: response?.message ?? '',
      });

      actionSteps.push(response?.message ?? '');

      logger.log('[ executeMobileDriverLoop ] actions taken', actionSteps.length);
    } else if (functionCall.function.name === 'keyboard_action') {
      const response = await mobileKeyboardActionCall(
        JSON.parse(functionCall.function.arguments) as KeyboardAction,
        driver,
      );

      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: response?.message ?? '',
      });

      actionSteps.push(response?.message ?? '');

      logger.log('[ executeMobileDriverLoop ] actions taken', actionSteps.length);
    } else if (functionCall.function.name === 'write_error') {
      logger.error(functionCall.function.arguments);

      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: 'Error written to log',
      });

      actionSteps.push(functionCall.function.arguments);
    } else if (functionCall.function.name === 'write_test_result') {
      const { success, message } = JSON.parse(functionCall.function.arguments) as {
        success: boolean;
        message: string;
      };

      logger.info(`[ TEST RESULT ][ ${success ? '✅' : '❌'} ]`, message);

      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: `Result written to log, test is ${success ? '✅' : '❌'}. End the test now.`,
      });

      actionSteps.push(message);
    } else if (functionCall.function.name === 'wait') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: `Waited for ${functionCall.function.arguments} seconds`,
      });

      actionSteps.push(functionCall.function.arguments);
    } else {
      actionSteps.push('tool call not found:', functionCall.function.arguments);
      contents.push({
        role: 'tool',
        tool_call_id: functionCall.id,
        content: `Tool call not found: ${functionCall.function.arguments}`,
      });
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const currentPageSource = await driver.getPageSource();

  contents.push({
    role: 'user',
    content: currentPageSource,
  });
  addScreenshotToContents(contents, driver);

  logger.debug('[ added contents tool results ]', contents.length);
  await driver.waitUntil(
    async () => {
      const currentPageSource = await driver.getPageSource();
      return currentPageSource.length > 0;
    },
    { timeout: 1000, timeoutMsg: 'Page source is not ready' },
  );

  logger.debug('[ added contents page source ]', contents.length);
  logger.debug('[ action steps taken ]', actionSteps.length);

  return contents;
};

/**
 * The jury is out on whether screenshots help or not
 * @param contents - the contents of the message
 * @param driver - the driver to use to take the screenshot
 */
const addScreenshotToContents = async (
  contents: ChatCompletionMessageParam[],
  driver: WebdriverIO.Browser,
) => {
  const currentPageScreenshot = await driver.saveScreenshot(`screen-${Date.now()}.png`);
  const base64Screenshot = currentPageScreenshot.toString('base64');
  contents.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Current screenshot of the page:',
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Screenshot}`,
        },
      },
    ],
  });
};
