/**
 * Initializes and calls the LLM agent loop with the provided prompt and system prompt.
 *
 * @param prompt - The user prompt to send to the LLM agent
 * @param systemPrompt - The system prompt that defines the agent's behavior and context
 * @param driver - The WebdriverIO browser instance for interacting with the page
 * @param model - The LLM model to use (defaults to GEMINI_2_5_PRO)
 * @returns A promise that resolves with the response from the LLM agent loop
 *
 * @example
 * ```typescript
 * const response = await callAgentInit(
 *   "Click the login button",
 *   "You are a web automation agent",
 *   driver,
 *   GeminiModel.GEMINI_2_5_PRO
 * );
 * ```
 */

import { callLlmAgentLoop } from '@Ai/Bot/Agent/app-agent/agent-loop';
import { GeminiModel, type LLMModel } from '@Ai/Bot/Providers/models';
import { logger } from '@Ai/Bot/Utils/logger';
import { type ChatCompletionMessageParam } from 'openai/resources';

export const callAgentInit = async (
  prompt: string,
  systemPrompt: string,
  driver: WebdriverIO.Browser,
  model: LLMModel = GeminiModel.GEMINI_2_5_PRO,
) => {
  logger.debug('[ callAgentInit ] with', prompt.substring(0, 30), '...');

  const content: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const pageSource = await driver.getPageSource();

  content.push({
    role: 'user',
    content: `Here is the page source: ${pageSource}`,
  });

  const actionSteps: string[] = [];

  const time = Date.now();
  const response = await callLlmAgentLoop(content, driver, actionSteps, model);
  const duration = Date.now() - time;

  logger.info('[ callLlmAgentLoop ] ✅ complete');
  logger.info('[ Duration ] 🕒 ', duration > 60000 ? `${duration / 60000}m` : `${duration}ms`);

  return response;
};
