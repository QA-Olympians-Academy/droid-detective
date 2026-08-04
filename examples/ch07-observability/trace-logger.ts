/**
 * CH7 — REASONING TRACE LOGGER
 *
 * In agentic automation a failure can happen for many reasons — wrong action,
 * bad timing, ambiguous DOM, sound reasoning on stale state. Observability
 * turns each loop step into a traceable decision by capturing four layers
 * (Chapter 7 README): reasoning, DOM interpretation, action confidence, and a
 * report a human can read.
 *
 * This module is that capture layer: record one `TraceStep` per loop
 * iteration, score its confidence, and render the markdown report — the same
 * format as workshop/07-observability/examples/reasoning-trace-example.md.
 */

// ── What we capture per step ──────────────────────────────────────────────────

export type SelectorType = 'accessibility_id' | 'resource_id' | 'text_xpath' | 'class_xpath';

export interface TraceStep {
  step: number;
  screenDetected: string;      // which screen the agent believes it is on
  domElements: number;         // interactable elements seen
  domElementsWithA11yId: number;
  reasoning: string;           // the model's own "Think" text
  action: string;              // e.g. `tap(~add-to-cart-1)`
  selectorType: SelectorType;
  retryCount: number;
  latencyMs: number;
}

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoredStep extends TraceStep {
  confidence: Confidence;
  signals: string[];           // why the score is what it is — never a bare number
}

// ── Confidence scoring ────────────────────────────────────────────────────────
// A step is only as trustworthy as its weakest signal: selector stability,
// accessibility coverage of the screen, and whether retries were needed.

export function scoreConfidence(step: TraceStep): ScoredStep {
  const signals: string[] = [];
  let score = 100;

  const coverage = step.domElements ? step.domElementsWithA11yId / step.domElements : 0;
  if (coverage < 0.7) {
    score -= 30;
    signals.push(`a11y coverage ${Math.round(coverage * 100)}% — agent may fall back to fragile selectors`);
  }

  if (step.selectorType === 'text_xpath' || step.selectorType === 'class_xpath') {
    score -= 40;
    signals.push(`${step.selectorType} selector — breaks on copy/layout changes`);
  } else if (step.selectorType === 'resource_id') {
    score -= 15;
    signals.push('resource-id selector — stable, but a11y id preferred');
  }

  if (step.retryCount > 0) {
    score -= 25 * step.retryCount;
    signals.push(`${step.retryCount} retr${step.retryCount === 1 ? 'y' : 'ies'} — flaky step candidate`);
  }

  if (step.latencyMs > 2000) {
    score -= 10;
    signals.push(`slow step (${step.latencyMs}ms) — possible animation/network wait`);
  }

  const confidence: Confidence = score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';
  return { ...step, confidence, signals };
}

// ── The logger ────────────────────────────────────────────────────────────────

export class TraceLogger {
  private steps: ScoredStep[] = [];

  constructor(private goal: string) {}

  record(step: Omit<TraceStep, 'step'>): ScoredStep {
    const scored = scoreConfidence({ ...step, step: this.steps.length + 1 });
    this.steps.push(scored);
    return scored;
  }

  /** The dashboard numbers: flaky steps first, they are where trust erodes. */
  summary() {
    return {
      totalSteps: this.steps.length,
      byConfidence: {
        HIGH: this.steps.filter((s) => s.confidence === 'HIGH').length,
        MEDIUM: this.steps.filter((s) => s.confidence === 'MEDIUM').length,
        LOW: this.steps.filter((s) => s.confidence === 'LOW').length,
      },
      flakySteps: this.steps.filter((s) => s.retryCount > 0 || s.confidence === 'LOW'),
      avgLatencyMs: Math.round(
        this.steps.reduce((sum, s) => sum + s.latencyMs, 0) / (this.steps.length || 1),
      ),
    };
  }

  /** Markdown in the reasoning-trace-example.md format — readable by a human,
   *  diffable in a PR, attachable as a CI artifact. */
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
