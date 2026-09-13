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

import { actAndObserve, observe } from './executor';
import { MODEL, think } from './llm';
import { LoopTools, type TestResult } from './tools';

const MAX_STEPS = 15; // budget: a lost agent must not loop forever
const MAX_PROSE_REPLIES = 2; // a model that keeps talking instead of acting is done
const MAX_REPEATS = 3; // the same failing call this many times in a row = stuck

export const runAgentLoop = async (
  goal: string,
  systemPrompt: string,
  driver: WebdriverIO.Browser,
): Promise<TestResult> => {
  const contents: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: goal },
    { role: 'user', content: `Here is the page source:\n${await observe(driver)}` },
  ];
  let pageSourceIndex = contents.length - 1; // where the latest observation lives
  const actionLog: string[] = [];
  let proseReplies = 0;
  let lastFailedStep = '';
  let repeats = 0;

  for (let step = 1; step <= MAX_STEPS; step++) {
    // ── Think ──
    process.stdout.write(`\n[ step ${step} ] thinking (${MODEL})… `);
    const started = Date.now();
    const response = await think(contents, LoopTools);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const toolCalls = response.tool_calls ?? [];

    // No tool calls → the model talked instead of acting. Text is not a
    // verdict: show it, remind the model once, give up if it keeps talking.
    if (toolCalls.length === 0) {
      const said = (response.content ?? '').trim().replace(/\s+/g, ' ');
      console.log(`${seconds}s, no tool call. Model said: "${said.slice(0, 200)}"`);
      if (++proseReplies >= MAX_PROSE_REPLIES) {
        return { success: false, message: `Agent stopped without a verdict: ${said}` };
      }
      contents.push({ role: 'assistant', content: said });
      contents.push({
        role: 'user',
        content: 'Do not describe the action — perform it by calling a tool (element_action, wait or write_test_result).',
      });
      continue;
    }
    proseReplies = 0;
    console.log(`${seconds}s, ${toolCalls.length} tool call(s)`);

    // Context hygiene: the model has decided — the old page source is stale,
    // so blank it before appending the assistant turn. Only the LATEST
    // observation stays full-size in the conversation.
    contents[pageSourceIndex].content = 'Old Page Source';
    contents.push({ role: 'assistant', tool_calls: toolCalls });

    // ── Act + Observe ──
    const verdict = await actAndObserve(toolCalls, contents, driver, actionLog);
    const outcomes = actionLog.slice(-toolCalls.length);
    outcomes.forEach((a) => console.log(`  → ${a}`));
    pageSourceIndex = contents.length - 1;

    if (verdict) {
      console.log(`\n[ verdict ] ${verdict.success ? '✅' : '❌'} ${verdict.message}`);
      return verdict;
    }

    // ── Repeat — or stop when stuck ──
    // A model that re-sends the exact same failing call is not reading the
    // feedback. Nudge once, then end the run: burning the budget helps nobody.
    const failedStep = outcomes.some((o) => o.startsWith('Failed')) ? JSON.stringify(toolCalls) : '';
    if (failedStep && failedStep === lastFailedStep) {
      repeats += 1;
      if (repeats >= MAX_REPEATS - 1) {
        console.log(`\n[ stuck ] the same failing action ${MAX_REPEATS} times in a row`);
        return { success: false, message: `Agent stuck: repeated a failing action ${MAX_REPEATS} times` };
      }
      contents.push({
        role: 'user',
        content:
          'You repeated the same failing action. That element is NOT on this screen. ' +
          'Choose a DIFFERENT element from the page source above, copying its content-desc verbatim.',
      });
    } else {
      repeats = 0;
    }
    lastFailedStep = failedStep;
  }

  console.log(`\n[ budget ] ${MAX_STEPS} steps used without a verdict`);
  return { success: false, message: `Step budget of ${MAX_STEPS} exhausted` };
};
