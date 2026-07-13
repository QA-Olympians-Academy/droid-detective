import { executeMobileDriverLoop } from '@Ai/Bot/Agent/app-agent/mobiledriver-loop';
import { TestTools } from '@Ai/Bot/Agent/tools';
import { OpenAIModel, type LLMModel } from '@Ai/Bot/Providers/models';
import { callLlm } from '@Ai/Bot/Providers/open-router';
import { logger } from '@Ai/Bot/Utils/logger';
import { type ChatCompletionMessage, type ChatCompletionMessageParam } from 'openai/resources';

export const callLlmAgentLoop = async (
  contents: ChatCompletionMessageParam[],
  driver: WebdriverIO.Browser,
  actionSteps: string[] = [],
  model: LLMModel = OpenAIModel.GPT_4o,
): Promise<ChatCompletionMessage> => {
  logger.debug('[ callLlmAgentLoop ] with', contents.length, 'contents');

  const response = await callLlm(contents, model, TestTools); //This is getting 400 request

  const toolCalls = response.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    contents[contents.length - 1].content = 'Old Page Source';
    contents.push({
      role: 'assistant',
      tool_calls: toolCalls,
    });

    logger.debug('[ callLlmAgentLoop ] with', toolCalls.length, 'function calls');
    const newContents = await executeMobileDriverLoop(toolCalls, contents, driver, actionSteps);

    logger.debug('[ callLlmAgentLoop ] calls executed, recursing');
    return await callLlmAgentLoop(newContents, driver, actionSteps, model);
  }

  logger.info('[ Action steps taken ]', actionSteps.map((step) => `[${step}]`).join('\n'));

  logger.debug('[ callLlmAgentLoop ] no function calls, returning');
  return response;
};
