# ch06 — Self-Healing

The five-step healing pipeline — detect → observe → propose → validate → apply
— runnable offline against a canned failure.

| File | What it is |
|------|------------|
| `self-healer.js` | The pipeline. Heuristic proposals by default (zero setup); `--llm` switches to a local model, the production approach. |
| `fixtures/appium.log` | A log where `~Login-tab` and `~button-LOGIN` genuinely failed (and `~input-email` shows why "never succeeded" filtering matters). |
| `fixtures/failing-screen.xml` | The drifted DOM: one content-desc renamed (Category A), one label moved to resource-id (the classic gotcha). |
| `fixtures/pageobjects/login.page.ts` | The page object the healer patches — into `./.healed/`, so runs are repeatable. |

## Run it (offline — no emulator, no LLM)

```bash
node examples/ch06-self-healing/self-healer.js
# with a local model instead of the heuristic (ollama pull llama3.1):
node examples/ch06-self-healing/self-healer.js --llm
```

Expected: `~Login-tab` heals to `~login-tab-v2` (rename) and `~button-LOGIN`
heals to `//*[@resource-id="button-LOGIN"]` (strategy switch). Compare
`fixtures/pageobjects/` with `.healed/` to see the patch.

## Why the validation gates matter

A patch is rejected — never written — if it targets a selector that didn't
actually fail, is malformed, or points at an element **not present in the
captured DOM** (an hallucinated value). The full production version, with
prompt engineering for small local models and a compile check, is annotated at
[workshop/06-self-healing/examples/heal-and-retry.js](../../workshop/06-self-healing/examples/heal-and-retry.js).

Theory and exercises: [workshop/06-self-healing](../../workshop/06-self-healing/README.md)
