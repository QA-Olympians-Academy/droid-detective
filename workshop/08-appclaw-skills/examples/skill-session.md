# What a `/generate-appclaw-flow` session looks like

Illustrative. Written to show the **shape** of the exchange, not copied from a
run; the wording differs every time, the shape does not:
understand → check → propose → (you approve) → write → validate.

---

**You**

> /generate-appclaw-flow
> App: com.wdiodemoapp on emulator-5554 (installed). Journey: open the Forms tab, type "hello" into the text input, verify the result label shows "hello". Known ids: tabs Home | Webview | Login | Forms | Swipe | Drag; input text-input; result label input-text-result. Phased format, write to flows/forms-text.yaml.

**Claude** *(steps 1–2: understands, then checks the repo)*

> Reading `flows/` and `.appclaw/env/` first.
> - `flows/login.yaml` exists for the same app: phased, `launchApp` + `waitUntil` in setup, targeted typing. I will mirror that style.
> - There is no `.appclaw/env/` directory. Nothing in this flow is secret, so none is needed.

**Claude** *(step 3: proposes, then stops)*

> **Plan — `flows/forms-text.yaml`** (phased, matching `flows/login.yaml`)
>
> Header: `appId: com.wdiodemoapp`, `platform: android`
> setup: `launchApp` → `waitUntil: "Forms"`
> steps: `tap: "Forms"` → `waitUntil: "text-input"` → `type "hello" in the text-input field` → `waitUntil: "input-text-result"`
> assertions: `assert: "hello"` → `done: "hello"`
>
> Note: both the input and the result label will contain "hello", so the text assertion is weak; the `waitUntil` on `input-text-result` is what confirms the label rendered. Want a stronger check, or shall I write this?

**You**

> Write it.

**Claude** *(steps 4–5: writes, validates)*

> Wrote `flows/forms-text.yaml`. A device is connected. Run it with
> `appclaw --flow flows/forms-text.yaml --strict`?

---

## Where sessions go wrong

| Symptom | Cause | Say |
|---------|-------|-----|
| It writes the file immediately | Skipped its own step 3 | "Propose the plan first; do not write yet." |
| Steps like `tap: "Forms tab"` | You gave screen names, not ids | Paste ids from `/appium-locators`, or install the `wdio-demo-app` skill (Exercise 8, Part C) |
| It moves the demo credentials into `.appclaw/env/` secrets | It treats any credential as secret | "These are the app's public demo credentials; keep them literal." |
| It offers to run `appclaw "goal"` | Wrong mode for the job | Ask for `--flow` only; goal runs use the slow local model |
