/**
 * CH5 — LLM PROVIDER
 *
 * One function: send the conversation + tool definitions, get the model's
 * next message back. Works against any OpenAI-compatible endpoint:
 *
 *   OpenRouter (default) : export OPEN_ROUTER_API_KEY=... LLM_BASE_URL=https://openrouter.ai/api/v1
 *   Local Ollama         : export LLM_BASE_URL=http://localhost:11434/v1 LLM_API_KEY=ollama LLM_MODEL=qwen2.5
 *
 * Mirrors `bot/ai/providers/open-router.ts`, kept standalone so this example
 * has no dependency on the production bot.
 */

import { OpenAI } from 'openai';
import { type ChatCompletionMessageParam, type ChatCompletionTool } from 'openai/resources';

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY || process.env.OPEN_ROUTER_API_KEY,
});

export const MODEL = process.env.LLM_MODEL || 'gpt-4o';

export const think = async (
  contents: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
) => {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: contents,
    tools,
  });
  return response.choices[0].message;
};
