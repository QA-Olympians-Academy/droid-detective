// @ts-nocheck
/**
 * CH5 — THE AGENTIC EXECUTION LOOP  (WORKSHOP EXERCISE STUB)
 *
 * Implement Think → Act → Observe → Repeat. `tools.ts`, `llm.ts`, and
 * `run.ts` are provided; you build the loop itself (and the executor in
 * `executor.ts`).
 *
 * Reference implementation: git checkout main -- examples/ch05-execution-loop
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
  // TODO(ch5): seed the conversation — system prompt, the goal, and the
  // CURRENT page source as the first observation.
  const contents: ChatCompletionMessageParam[] = [];
  const actionLog: string[] = [];

  for (let step = 1; step <= MAX_STEPS; step++) {
    // TODO(ch5) — one loop iteration:
    //   THINK   — const response = await think(contents, LoopTools)
    //   • no tool_calls?  the model is done talking → return an inconclusive
    //     TestResult with its text.
    //   • context hygiene: the old page source is stale and huge — overwrite
    //     the last message's content with 'Old Page Source' BEFORE pushing
    //     the assistant turn ({ role: 'assistant', tool_calls }).
    //   ACT+OBSERVE — const verdict = await actAndObserve(toolCalls, contents, driver, actionLog)
    //   • verdict returned?  the model called write_test_result → return it.
    throw new Error('TODO(ch5): implement the Think → Act → Observe iteration');
  }

  return { success: false, message: `Step budget of ${MAX_STEPS} exhausted` };
};
