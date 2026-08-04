/**
 * CH4 — GOAL PLANNER
 *
 * A high-level test goal is a statement of intent — "Log in with valid
 * credentials and verify the home screen" — not a list of steps. The agent
 * decomposes it into concrete actions by combining two inputs:
 *
 *   1. the goal text (what the user wants), and
 *   2. the locator map of the CURRENT screen (what is actually there).
 *
 * In the real agent (Chapter 5) an LLM does this decomposition on every loop
 * iteration. Here the same reasoning is written out as deterministic code so
 * you can trace it: match goal vocabulary against on-screen element identity,
 * type into inputs, tap buttons, and end with a verification step.
 *
 * The point to internalise: the plan comes from the DOM, never from
 * assumptions. `~button-LOGIN` is used because the hierarchy says so — an
 * agent that guesses `~LOGIN-button` fails (Chapter 4 README, "gotchas").
 */

import { type LocatorMapEntry } from './dom-interpreter';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlannedActionType = 'tap' | 'type' | 'assert_visible';

export interface PlannedStep {
  step: number;
  intent: string;              // the human-readable "Think" part
  action: PlannedActionType;   // the "Act" part
  selector: string;            // best-ranked locator from the map
  value?: string;              // for `type`
  fallbacks: string[];         // alternative locators if the best one fails
}

export interface TestData {
  [field: string]: string;     // e.g. { email: 'alice@example.com', password: '...' }
}

// ── Vocabulary matching ───────────────────────────────────────────────────────

/**
 * Score how strongly a locator-map entry relates to a word from the goal.
 * The agent reads identity from every attribute it has: content-desc first,
 * then resource-id, then visible text.
 */
function relevance(entry: LocatorMapEntry, word: string): number {
  const w = word.toLowerCase();
  const el = entry.element;
  if (el.contentDesc?.toLowerCase().includes(w)) return 3;
  if (el.resourceId?.toLowerCase().includes(w)) return 2;
  if (el.text?.toLowerCase().includes(w)) return 1;
  return 0;
}

function findEntry(map: LocatorMapEntry[], ...words: string[]): LocatorMapEntry | undefined {
  let best: { entry: LocatorMapEntry; score: number } | undefined;
  for (const entry of map) {
    const score = words.reduce((sum, word) => sum + relevance(entry, word), 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry;
}

const toStep = (
  step: number,
  intent: string,
  action: PlannedActionType,
  entry: LocatorMapEntry,
  value?: string,
): PlannedStep => ({
  step,
  intent,
  action,
  selector: entry.best.selector,
  value,
  fallbacks: entry.alternatives.map((c) => c.selector),
});

// ── The planner ───────────────────────────────────────────────────────────────

/**
 * Decompose a goal into planned steps against the current screen.
 *
 * Strategy (mirrors the LLM's chain of thought):
 *   1. Fill every input field the goal's test data refers to.
 *   2. Tap the primary action the goal names (login, submit, sign up…).
 *   3. Verify: assert on the element the goal says proves success.
 */
export function planGoal(goal: string, map: LocatorMapEntry[], data: TestData): PlannedStep[] {
  const steps: PlannedStep[] = [];
  let n = 1;

  // 1. Inputs — for each piece of test data, find the matching field on screen.
  for (const [field, value] of Object.entries(data)) {
    const entry = findEntry(map, field, 'input');
    if (!entry) continue;
    const shown = entry.element.password ? '••••••••' : value;
    steps.push(toStep(n++, `Enter ${field} ("${shown}") into the ${field} field`, 'type', entry, value));
  }

  // 2. Primary action — the verb the goal names, matched against the screen.
  const actionWords = ['login', 'log in', 'submit', 'sign up', 'checkout', 'add to cart']
    .filter((verb) => goal.toLowerCase().includes(verb))
    .flatMap((verb) => verb.split(' '));
  const button = findEntry(map, ...(actionWords.length ? actionWords : ['button']));
  if (button) {
    steps.push(toStep(n++, `Tap the primary action for "${goal}"`, 'tap', button));
  }

  // 3. Verification — the agent never ends a plan without a check. If the goal
  //    names a target state ("verify the home screen"), assert on it; the demo
  //    screen exposes the error message element, so assert it stays hidden.
  const verify =
    findEntry(map, ...goal.toLowerCase().split(/\W+/).filter((w) => w.length > 3)) ??
    findEntry(map, 'error', 'message');
  if (verify) {
    steps.push(toStep(n++, `Verify the outcome of "${goal}"`, 'assert_visible', verify));
  }

  return steps;
}

// ── Pretty-printer used by run.ts ─────────────────────────────────────────────

export function formatPlan(goal: string, steps: PlannedStep[]): string {
  const lines = steps.map((s) => {
    const value = s.value ? `  value: "${s.value}"` : '';
    const fallbacks = s.fallbacks.length ? `\n     fallbacks: ${s.fallbacks.join('  |  ')}` : '';
    return ` ${s.step}. [${s.action}] ${s.intent}\n     selector:  ${s.selector}${value}${fallbacks}`;
  });
  return `Goal: "${goal}"\n\n${lines.join('\n')}`;
}
