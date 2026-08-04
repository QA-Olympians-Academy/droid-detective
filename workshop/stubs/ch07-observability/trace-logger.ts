// @ts-nocheck
/**
 * CH7 — REASONING TRACE LOGGER  (WORKSHOP EXERCISE STUB)
 *
 * Turn each loop step into a traceable decision: record a `TraceStep`, score
 * its confidence, render the markdown report. The types and the report
 * renderer are provided; you implement the scoring and the logger.
 * `run.ts` replays a canned session through your implementation.
 *
 * Reference implementation: git checkout main -- examples/ch07-observability
 */

// ── Types (provided — do not change) ─────────────────────────────────────────

export type SelectorType = 'accessibility_id' | 'resource_id' | 'text_xpath' | 'class_xpath';

export interface TraceStep {
  step: number;
  screenDetected: string;
  domElements: number;
  domElementsWithA11yId: number;
  reasoning: string;
  action: string;
  selectorType: SelectorType;
  retryCount: number;
  latencyMs: number;
}

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoredStep extends TraceStep {
  confidence: Confidence;
  signals: string[];
}

// ── Confidence scoring ────────────────────────────────────────────────────────

export function scoreConfidence(step: TraceStep): ScoredStep {
  // TODO(ch7): start from 100 and subtract per weak signal, pushing a
  // human-readable reason into `signals` each time:
  //   a11y coverage < 70%      → −30   ("agent may fall back to fragile selectors")
  //   text/class selector      → −40   resource-id → −15
  //   each retry               → −25   ("flaky step candidate")
  //   latency > 2000ms         → −10
  // Map the result: ≥75 HIGH, ≥45 MEDIUM, else LOW.
  throw new Error('TODO(ch7): implement scoreConfidence');
}

// ── The logger ────────────────────────────────────────────────────────────────

export class TraceLogger {
  private steps: ScoredStep[] = [];

  constructor(private goal: string) {}

  record(step: Omit<TraceStep, 'step'>): ScoredStep {
    // TODO(ch7): number the step (1-based), score it, store it, return it.
    throw new Error('TODO(ch7): implement record');
  }

  /** The dashboard numbers: flaky steps first, they are where trust erodes. */
  summary() {
    // TODO(ch7): totalSteps, counts by confidence, flakySteps (any retry or
    // LOW confidence), avgLatencyMs.
    throw new Error('TODO(ch7): implement summary');
  }

  /** Markdown in the reasoning-trace-example.md format (provided). */
  toMarkdown(): string {
    const stepBlocks = this.steps.map((s) => {
      const coverage = s.domElements
        ? `${s.domElementsWithA11yId} / ${s.domElements} (${Math.round((s.domElementsWithA11yId / s.domElements) * 100)}%)`
        : 'n/a';
      const signalNote = s.signals.length ? ` — ${s.signals.join('; ')}` : '';
      return [
        `## Step ${s.step}`,
        '',
        `**[OBS] screen_detected:** \`${s.screenDetected}\`  `,
        `**[OBS] elements_with_a11y_id:** ${coverage}  `,
        `**[OBS] confidence:** ${s.confidence}${signalNote}`,
        '',
        '**Reasoning:**',
        `> ${s.reasoning}`,
        '',
        `**Action:** \`${s.action}\`  `,
        `**[OBS] selector_type:** ${s.selectorType}  `,
        `**[OBS] retry_count:** ${s.retryCount}  `,
        `**[OBS] latency_ms:** ${s.latencyMs}`,
      ].join('\n');
    });

    const sum = this.summary();
    const flaky = sum.flakySteps.length
      ? sum.flakySteps.map((s) => `- Step ${s.step}: ${s.signals.join('; ')}`).join('\n')
      : '- none 🎉';

    return [
      '# Reasoning Trace',
      '',
      `**Goal:** \`${this.goal}\``,
      '',
      '---',
      '',
      stepBlocks.join('\n\n---\n\n'),
      '',
      '---',
      '',
      '## Run summary',
      '',
      `| Metric | Value |`,
      `|---|---|`,
      `| Steps | ${sum.totalSteps} |`,
      `| Confidence | ${sum.byConfidence.HIGH} HIGH / ${sum.byConfidence.MEDIUM} MEDIUM / ${sum.byConfidence.LOW} LOW |`,
      `| Avg latency | ${sum.avgLatencyMs}ms |`,
      '',
      '**Steps to investigate:**',
      flaky,
      '',
    ].join('\n');
  }
}
