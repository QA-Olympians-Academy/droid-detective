# ch04 — The Agent's Mind

How an agent turns a raw DOM dump plus a high-level goal into a concrete plan.

| File | What it shows |
|------|---------------|
| `dom-interpreter.ts` | Parse a uiautomator hierarchy, keep the interactable elements, rank locator candidates per element (accessibility-id → resource-id → text → class). |
| `goal-planner.ts` | Decompose a goal ("Log in with valid credentials…") into typed steps by matching goal vocabulary against on-screen element identity. |
| `run.ts` | Prints the locator map and the plan for the Chapter 4 sample screen. |

## Run it (offline — no emulator, no LLM)

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts
```

The input is the annotated hierarchy at
[workshop/04-agent-mind/examples/dom-hierarchy-sample.xml](../../workshop/04-agent-mind/examples/dom-hierarchy-sample.xml).

## The idea

In the real agent (Chapter 5) an **LLM** performs both of these steps on every
loop iteration — this example writes the same reasoning as deterministic code
so you can trace it. Notice that the plan uses `~button-LOGIN`, never
`~LOGIN-button`: identity comes from the DOM, not from assumptions.

Theory and exercises: [workshop/04-agent-mind](../../workshop/04-agent-mind/README.md)
