/**
 * CH4 — RUNNER
 *
 * Reads the annotated sample hierarchy from Chapter 4, prints the locator map
 * (what the agent "sees") and a plan for a high-level goal (what the agent
 * "decides"). Fully offline — no emulator or LLM needed.
 *
 *   pnpm exec ts-node examples/ch04-agent-mind/run.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { buildLocatorMap, formatLocatorMap } from './dom-interpreter';
import { formatPlan, planGoal } from './goal-planner';

const xml = readFileSync(
  join(__dirname, '../../workshop/04-agent-mind/examples/dom-hierarchy-sample.xml'),
  'utf8',
);

const map = buildLocatorMap(xml);

console.log('═'.repeat(72));
console.log('LOCATOR MAP — interactable elements on the current screen');
console.log('═'.repeat(72));
console.log(formatLocatorMap(map));

const goal = 'Log in with valid credentials and verify no error message is shown';

console.log();
console.log('═'.repeat(72));
console.log('PLAN — goal decomposed against the locator map');
console.log('═'.repeat(72));
console.log(
  formatPlan(goal, planGoal(goal, map, { email: 'alice@example.com', password: '10203040' })),
);
