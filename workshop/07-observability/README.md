# Chapter 7 — Agentic Observability for Mobile QA

**Duration:** 30 minutes  
**Prerequisites:** Chapters 5–6 complete

---

## Learning objectives

- Capture and interpret agent reasoning traces
- Understand DOM interpretation as observable signal
- Use action confidence scoring to find flaky steps
- Integrate agent logs with dashboards
- Use observability to explain AI decisions to stakeholders

---

## Why observability is different for agentic systems

In traditional test automation, a failure is deterministic: the test did X, expected Y, got Z. The log is simple.

In agentic automation, a failure can happen for many reasons:
- The agent chose the wrong next action
- The agent was correct but the timing was off
- The agent healed itself but the root cause was not actually fixed
- The agent's reasoning was sound but the DOM was ambiguous

Without observability, all of these look like "test failed." With observability, each failure is a traceable decision.

---

## Four observability layers

### Layer 1 — Reasoning traces

Every agent step produces a reasoning trace: what the agent saw, what it concluded, and what it decided to do next.

See [examples/reasoning-trace-example.md](examples/reasoning-trace-example.md) for an annotated trace showing how to read each component.

Raw trace format (from the Anthropic API):
```json
{
  "type": "thinking",
  "thinking": "I can see the Login tab. The current screen shows the home screen...",
}
```

Capture by enabling extended thinking in the API call (see `bot/ai/agent/app-agent/agent-loop.ts`).

### Layer 2 — DOM interpretation signals

After each `get_page_source()` call, log:
- Number of elements found
- Number of elements with accessibility IDs vs without
- Which screen was identified (inferred from landmark elements)

These metrics detect DOM quality degradation over time — before tests start failing.

### Layer 3 — Action confidence scoring

Not every tool call is equally certain. Score each action:

| Signal | Low confidence | High confidence |
|--------|---------------|----------------|
| Selector type | Text XPath | Accessibility ID |
| Wait required | Yes (element not immediately visible) | No |
| Retry count | >1 | 0 |
| DOM ambiguity | Multiple matching elements | Exactly one |

A single step with low confidence in every run is a flakiness candidate — fix the locator before it causes a failure.

### Layer 4 — Failure analysis issues

When the healing loop cannot fix a failure automatically, `analyse-failures.js` converts the Appium log into a structured GitHub issue:

- **Summary** — one-sentence root cause
- **Failing tests** — bullet list with test name and error
- **Error details** — key messages extracted from the log
- **Suggested fix** — actionable next step

See [examples/android-tests.yml](examples/android-tests.yml) for the CI pipeline that runs both the healing step and the failure analysis step.

---

## Integrating with dashboards

Agent reasoning traces are structured — they can be streamed to any logging backend:

```typescript
// Log each agent step as a structured event
logger.info({
  event: 'agent_step',
  step: stepNumber,
  goal: testGoal,
  screen: inferredScreen,
  action: toolCall.name,
  selector: toolCall.input.selector,
  confidence: computeConfidence(toolCall),
  latencyMs: stepDuration,
})
```

Query patterns:
- `confidence < 0.5` → flakiness candidates
- `action = write_error` → genuine failures
- `latencyMs > 5000` → slow steps (timing issues)
- `screen = unknown` → unrecognised screens (accessibility gaps)

---

## Using observability to explain AI decisions

The hardest question from stakeholders is: **"Why did the agent do that?"**

The answer is in the reasoning trace. The trace is human-readable — it is the agent's internal monologue. When an agent makes an unexpected decision:

1. Find the step in the trace log
2. Read the "Reasoning" block for that step
3. Identify what the agent saw that led to that decision
4. If the DOM was ambiguous, add a more specific selector
5. If the goal was ambiguous, tighten the test goal wording

This is debugging for agentic systems: you debug the reasoning, not just the code.

---

## Exercise

- [Exercise 7 — Read a reasoning trace and identify confidence signals](exercises/exercise-7.md)
