# ch07 — Agentic Observability

Capture each loop iteration as a traceable decision: reasoning, DOM
interpretation, action confidence, and a human-readable report.

| File | What it is |
|------|------------|
| `trace-logger.ts` | `TraceStep` capture, confidence scoring (selector stability + a11y coverage + retries + latency), markdown report renderer. |
| `run.ts` | Replays the Chapter 7 sample session and writes `trace-report.md`. |

## Run it (offline)

```bash
pnpm exec ts-node examples/ch07-observability/run.ts
```

The generated report follows the same format as the annotated example at
[workshop/07-observability/examples/reasoning-trace-example.md](../../workshop/07-observability/examples/reasoning-trace-example.md).

## The point

The replayed run **succeeded** — and still ends with a step flagged for
investigation (text-based selector, one retry, slow). That is the difference
observability makes: you find the flake before it becomes a red build, and you
can explain *why* the agent did what it did to a stakeholder.

To wire it live, call `logger.record(...)` inside the Chapter 5 loop — one
record per Think→Act→Observe iteration — and upload `trace-report.md` as a CI
artifact (Chapter 9).

Theory and exercises: [workshop/07-observability](../../workshop/07-observability/README.md)
