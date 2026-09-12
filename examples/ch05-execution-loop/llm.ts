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
 *   Other Ollama model : export LLM_MODEL=qwen2.5
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
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: contents,
    tools,
  });
  return response.choices[0].message;
};
