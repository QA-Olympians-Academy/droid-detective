/**
 * CH5 — THE AGENTIC EXECUTION LOOP ("Think → Act → Observe → Repeat")
 *
 * This is the heart of the whole workshop, distilled to its minimum:
 *
 *   Think   — send the conversation (goal + latest page source) to the LLM
 *   Act     — execute whichever tool calls it answered with
 *   Observe — capture the new page source, append it to the conversation
 *   Repeat  — until the model reports a verdict (or the step budget runs out)
 *
 * Distilled from `bot/ai/agent/app-agent/agent-loop.ts` + `agent-init.ts`.
 */

import { type ChatCompletionMessageParam } from 'openai/resources';

import { actAndObserve } from './executor';
import { think } from './llm';
import { LoopTools, type TestResult } from './tools';

const MAX_STEPS = 15; // budget: a lost agent must not loop forever

export const runAgentLoop = async (
  goal: string,
  systemPrompt: string,
  driver: WebdriverIO.Browser,
): Promise<TestResult> => {
  const contents: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: goal },
    { role: 'user', content: `Here is the page source: ${await driver.getPageSource()}` },
  ];
  const actionLog: string[] = [];

  for (let step = 1; step <= MAX_STEPS; step++) {
    // ── Think ──
    const response = await think(contents, LoopTools);
    const toolCalls = response.tool_calls;

    // No tool calls → the model is done talking; treat as an inconclusive end.
    if (!toolCalls || toolCalls.length === 0) {
      return { success: false, message: response.content ?? 'Agent stopped without a verdict' };
    }

    console.log(`\n[ step ${step} ] ${toolCalls.length} tool call(s)`);

    // Context hygiene: the model has decided — the old page source is stale
    // and huge, so blank it before appending the assistant turn. Only the
    // LATEST observation stays full-size in the conversation.
    contents[contents.length - 1].content = 'Old Page Source';
    contents.push({ role: 'assistant', tool_calls: toolCalls });

    // ── Act + Observe ──
    const verdict = await actAndObserve(toolCalls, contents, driver, actionLog);
    actionLog.slice(-toolCalls.length).forEach((a) => console.log(`  → ${a}`));

    if (verdict) {
      console.log(`\n[ verdict ] ${verdict.success ? '✅' : '❌'} ${verdict.message}`);
      return verdict;
    }
  }

  return { success: false, message: `Step budget of ${MAX_STEPS} exhausted` };
};
