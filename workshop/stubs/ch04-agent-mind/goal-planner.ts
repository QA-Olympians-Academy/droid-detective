// @ts-nocheck
/**
 * CH4 — GOAL PLANNER  (WORKSHOP EXERCISE STUB)
 *
 * Decompose a high-level goal ("Log in with valid credentials…") into typed
 * steps by matching goal vocabulary against the locator map of the CURRENT
 * screen. In the real agent (ch5) an LLM does this on every loop iteration —
 * here you write the same reasoning as deterministic code.
 *
 * Rule zero: the plan comes from the DOM, never from assumptions.
 * `~button-LOGIN` because the hierarchy says so — never `~LOGIN-button`.
 *
 * Reference implementation: git checkout main -- examples/ch04-agent-mind
 */

import { type LocatorMapEntry } from './dom-interpreter';

// ── Types (provided — do not change) ─────────────────────────────────────────

export type PlannedActionType = 'tap' | 'type' | 'assert_visible';

export interface PlannedStep {
  step: number;
  intent: string;
  action: PlannedActionType;
  selector: string;
  value?: string;
  fallbacks: string[];
}

export interface TestData {
  [field: string]: string;
}

// ── The planner ───────────────────────────────────────────────────────────────

/**
 * TODO(ch4): implement in three moves, mirroring the LLM's chain of thought:
 *   1. INPUTS — for each entry in `data`, find the on-screen field whose
 *      identity (content-desc > resource-id > text) matches the field name;
 *      emit a `type` step with the value.
 *   2. PRIMARY ACTION — find the button matching the goal's verb
 *      (login / submit / sign up …); emit a `tap` step.
 *   3. VERIFICATION — never end a plan without a check; emit an
 *      `assert_visible` on the element the goal names as proof.
 * Each step's `selector` is the entry's best locator; `fallbacks` are the
 * alternatives, in ranked order.
 */
export function planGoal(goal: string, map: LocatorMapEntry[], data: TestData): PlannedStep[] {
  throw new Error('TODO(ch4): implement planGoal');
}

// ── Pretty-printer (provided — used by run.ts) ────────────────────────────────

export function formatPlan(goal: string, steps: PlannedStep[]): string {
  const lines = steps.map((s) => {
    const value = s.value ? `  value: "${s.value}"` : '';
    const fallbacks = s.fallbacks.length ? `\n     fallbacks: ${s.fallbacks.join('  |  ')}` : '';
    return ` ${s.step}. [${s.action}] ${s.intent}\n     selector:  ${s.selector}${value}${fallbacks}`;
  });
  return `Goal: "${goal}"\n\n${lines.join('\n')}`;
}
