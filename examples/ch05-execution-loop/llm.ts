/**
 * CH5 — LLM PROVIDER
 *
 * One function: send the conversation + tool definitions, get the model's
 * next message back. Works against any OpenAI-compatible endpoint.
 *
 * Defaults to a local Ollama server running llama3.1 — no env vars needed:
 *
 *   ollama pull llama3.1   # once
 *   ollama serve           # if not already running
 *
 * Override with env vars for another model or a hosted provider:
 *
 *   Other Ollama model : export LLM_MODEL=llama3.2:3b   (half the RAM and 2× faster, but too small to finish the login goal)
 *   OpenRouter         : export LLM_BASE_URL=https://openrouter.ai/api/v1 OPEN_ROUTER_API_KEY=sk-... LLM_MODEL=openai/gpt-4o
 *
 * Mirrors `bot/ai/providers/open-router.ts`, kept standalone so this example
 * has no dependency on the production bot.
 */

import { OpenAI } from 'openai';
import { type ChatCompletionMessageParam, type ChatCompletionTool } from 'openai/resources';

// Ollama's OpenAI-compatible endpoint. It ignores the key, but the SDK
// refuses to start without one, so any non-empty string will do.
const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const OLLAMA_API_KEY = 'ollama';

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || OLLAMA_BASE_URL,
  apiKey: process.env.LLM_API_KEY || process.env.OPEN_ROUTER_API_KEY || OLLAMA_API_KEY,
});

export const MODEL = process.env.LLM_MODEL || 'llama3.1';

export const think = async (
  contents: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
) => {
  const started = Date.now();
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: contents,
    tools,
    temperature: 0, // pick the most likely tool call, not a creative one — small models invent ids otherwise
  });
  if (process.env.LLM_DEBUG) {
    const { prompt_tokens, completion_tokens } = response.usage ?? {};
    console.log(`\n    [llm] ${prompt_tokens} prompt + ${completion_tokens} completion tokens in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  return response.choices[0].message;
};
