# ch05 — The Agentic Execution Loop

The Think → Act → Observe → Repeat loop, distilled from the production bot
(`bot/ai/agent/`) into five small standalone files.

| File | Role in the loop |
|------|------------------|
| `loop.ts` | **Think + Repeat** — drives the conversation, enforces the step budget, stops a stuck agent, ends on a verdict. |
| `executor.ts` | **Act + Observe** — executes tool calls on the device, feeds outcomes and a compressed page source back. |
| `tools.ts` | The tool contract the LLM acts through (`element_action`, `wait`, `write_test_result`). |
| `llm.ts` | One-function provider for any OpenAI-compatible endpoint. |
| `run.ts` | Wires it to a local emulator, a system prompt and a plain-English goal. |

## Run it (needs emulator + LLM)

By default `llm.ts` talks to a local Ollama server at `http://localhost:11434`
and uses `llama3.1` — no API key or env vars required.

```bash
# once
ollama pull llama3.1

# terminal 1
pnpm appium

# terminal 2 — local Ollama + llama3.1 (default, nothing to export)…
# …or another Ollama model:
# export LLM_MODEL=llama3.2:3b
# …or OpenRouter:
# export LLM_BASE_URL=https://openrouter.ai/api/v1 OPEN_ROUTER_API_KEY=sk-... LLM_MODEL=openai/gpt-4o

pnpm exec ts-node examples/ch05-execution-loop/run.ts
# or with your own goal:
pnpm exec ts-node examples/ch05-execution-loop/run.ts "Open the Forms tab and toggle the switch"
```

A passing run — llama3.1 on an Apple M-series laptop with the model already
loaded, about 35 s end to end:

```
[ step 1 ] thinking (llama3.1)… 1.5s, 1 tool call(s)
  → Action click performed on element ~Login

[ step 2 ] thinking (llama3.1)… 1.8s, 1 tool call(s)
  → Action set_text performed on element ~input-email

[ step 3 ] thinking (llama3.1)… 1.3s, 1 tool call(s)
  → Action click performed on element ~button-LOGIN

[ step 4 ] thinking (llama3.1)… 1.5s, 1 tool call(s)
  → Action set_text performed on element ~input-password

[ step 5 ] thinking (llama3.1)… 1.4s, 1 tool call(s)
  → Action click performed on element ~button-LOGIN

[ step 6 ] thinking (llama3.1)… 1.3s, 1 tool call(s)
  → Result recorded (✅). End the test now.

[ verdict ] ✅ You are logged in!

[ result ] PASS — You are logged in!
```

Step 3 is the agent pressing LOGIN with an empty password, reading
`Please enter at least 8 characters` in the next page source and fixing it —
self-correction, live. `LLM_DEBUG=1` adds token counts and timing per Think.

### Local models — what to expect

| Model | Think step | Login goal |
|-------|-----------|------------|
| `llama3.1` (8B, default) | 1.5–3.5 s; 30–40 s for the very first call while Ollama loads the model | passes in 6 steps |
| `llama3.2:3b` | ≈1.5 s | reaches the form, then loops on the tab toggle or invents ids — does not pass |
| hosted, e.g. `openai/gpt-4o` via OpenRouter | 2–4 s | passes |

Pre-load the model before a demo: `curl -s localhost:11434/api/generate -d '{"model":"llama3.1"}'`.

Write the goal like a test step. "Log in with…" alone made both local models tap
the *Login* tab toggle over and over; naming the button and the expected message
(the default goal in `run.ts`) goes straight to `~button-LOGIN`.

> If you hit `Cannot find module 'webdriverio'`, run `pnpm add -D webdriverio`
> once — the same standalone import the production `bot/index.ts` uses.

## What to watch for

- **One tool call per step** — the first line of the system prompt in `run.ts`.
  Buried further down, llama3.1 planned the whole flow blind: five calls, 700+
  tokens, 30 s per step, and ids for screens it had never seen.
- **Page-source compression** in `executor.ts`: Appium's XML is 30–40 KB per
  screen (≈10k tokens). One line per element with just the identifying
  attributes, the label of clickable containers and the current value of inputs
  is ≈3% of that. Above ~10k tokens an 8B model answers in prose instead of
  calling tools.
- **Context hygiene** in `loop.ts`: only the latest page source stays full-size
  in the conversation — stale DOMs are blanked to `"Old Page Source"`.
- **Self-correction** in `executor.ts`: a failed action is not an exception —
  the error text goes back to the model, which re-reads the DOM and retries.
- **Verdict guards** in `executor.ts`: `write_test_result` only counts alone in
  its own step, and not straight after a failed action. Without them small
  models batch "click, click, success!" before anything ran.
- **Stuck detection** in `loop.ts`: the same action with no screen change gets
  one nudge naming the useless element, which then joins an "already tried"
  list appended to every later observation; a third identical repeat ends the run.
- The **step budget**: a lost agent must terminate, not loop forever.

The production version (LambdaTest cloud devices, Handlebars system prompt,
keyboard handling, screenshots) lives in `bot/` — run it with `pnpm bot`.

Theory and exercises: [workshop/05-execution-loop](../../workshop/05-execution-loop/README.md)
