/**
 * CH7 — RUNNER
 *
 * Replays the Chapter 7 "add to cart" session through the TraceLogger and
 * writes the observability report. Fully offline. In the real integration the
 * `logger.record(...)` call sits inside the Chapter 5 execution loop — one
 * record per Think→Act→Observe iteration.
 *
 *   pnpm exec ts-node examples/ch07-observability/run.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

import { TraceLogger } from './trace-logger';

const logger = new TraceLogger('Add the first product to the cart and verify the cart badge shows 1');

// The canned session from reasoning-trace-example.md — a run that SUCCEEDED
// but carried low-confidence signals worth catching before they become flakes.
logger.record({
  screenDetected: 'home',
  domElements: 14,
  domElementsWithA11yId: 12,
  reasoning:
    'I am on the Home screen. The first product has an "add-to-cart-1" button with an accessibility ID. I\'ll tap it.',
  action: 'tap(~add-to-cart-1)',
  selectorType: 'accessibility_id',
  retryCount: 0,
  latencyMs: 312,
});

logger.record({
  screenDetected: 'home',
  domElements: 14,
  domElementsWithA11yId: 12,
  reasoning:
    'The cart badge has no content-desc — I\'ll assert on its resource-id, which is more stable than its text.',
  action: 'assert_visible(//*[@resource-id="cart_badge" and @text="1"])',
  selectorType: 'resource_id',
  retryCount: 0,
  latencyMs: 287,
});

logger.record({
  screenDetected: 'cart',
  domElements: 9,
  domElementsWithA11yId: 4,
  reasoning:
    'I navigated to the cart to double-check the item. The row has no a11y id, so I match its visible title text.',
  action: 'assert_visible(//*[contains(@text,"Sauce Labs Backpack")])',
  selectorType: 'text_xpath',
  retryCount: 1,
  latencyMs: 2450,
});

const report = logger.toMarkdown();
const outPath = join(__dirname, 'trace-report.md');
writeFileSync(outPath, report);

console.log(report);
console.log(`\nReport written to ${outPath}`);

const { flakySteps } = logger.summary();
if (flakySteps.length) {
  console.log(`⚠️  ${flakySteps.length} step(s) need attention — this is the signal a dashboard alerts on.`);
}
