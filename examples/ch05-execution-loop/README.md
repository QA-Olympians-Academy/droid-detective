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

By default `llm.ts` talks to a local Ollama server at `http://localhost:11434`
and uses `llama3.2:3b` — no API key or env vars required.

```bash
# once
ollama pull llama3.2:3b

# terminal 1
pnpm appium

# terminal 2 — local Ollama + llama3.2:3b (default, nothing to export)…
# …or another Ollama model:
# export LLM_MODEL=llama3.1
# …or OpenRouter:
# export LLM_BASE_URL=https://openrouter.ai/api/v1 OPEN_ROUTER_API_KEY=sk-... LLM_MODEL=openai/gpt-4o

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
