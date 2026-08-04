# ch05 — The Agentic Execution Loop

The Think → Act → Observe → Repeat loop, distilled from the production bot
(`bot/ai/agent/`) into four small standalone files.

| File | Role in the loop |
|------|------------------|
| `loop.ts` | **Think + Repeat** — drives the conversation, enforces the step budget, ends on a verdict. |
| `executor.ts` | **Act + Observe** — executes tool calls on the device, feeds outcomes and the fresh page source back. |
| `tools.ts` | The tool contract the LLM acts through (`element_action`, `wait`, `write_test_result`). |
| `llm.ts` | One-function provider for any OpenAI-compatible endpoint. |
| `run.ts` | Wires it to a local emulator and a plain-English goal. |

## Run it (needs emulator + LLM)

```bash
# terminal 1
pnpm appium

# terminal 2 — OpenRouter…
export LLM_BASE_URL=https://openrouter.ai/api/v1 OPEN_ROUTER_API_KEY=sk-...
# …or local Ollama:
# export LLM_BASE_URL=http://localhost:11434/v1 LLM_API_KEY=ollama LLM_MODEL=qwen2.5

pnpm exec ts-node examples/ch05-execution-loop/run.ts
# or with your own goal:
pnpm exec ts-node examples/ch05-execution-loop/run.ts "Open the Forms tab and toggle the switch"
```

> If you hit `Cannot find module 'webdriverio'`, run `pnpm add -D webdriverio`
> once — the same standalone import the production `bot/index.ts` uses.

## What to watch for

- **Context hygiene** in `loop.ts`: only the latest page source stays full-size
  in the conversation — stale DOMs are blanked to `"Old Page Source"`.
- **Self-correction** in `executor.ts`: a failed action is not an exception —
  the error text goes back to the model, which re-reads the DOM and retries.
- The **step budget**: a lost agent must terminate, not loop forever.

The production version (LambdaTest cloud devices, Handlebars system prompt,
keyboard handling, screenshots) lives in `bot/` — run it with `pnpm bot`.

Theory and exercises: [workshop/05-execution-loop](../../workshop/05-execution-loop/README.md)
