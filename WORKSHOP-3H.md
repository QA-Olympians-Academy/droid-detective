# Test Smarter, Not Harder — 3-Hour Workshop

**Speaker:** Ioannis Papadakis · Snappi
**Level:** Intermediate
**Stack:** Claude Code · Appium · WebdriverIO · AppClaw · GitHub Actions
**Format:** 3 hours · 1 break · hands-on

> A focused, hands-on cut of the full-day course. The goal for these 3 hours:
> get every participant from a working Android environment to a **self-healing,
> agentic test that runs the Think → Act → Observe loop on a real screen.**
> Deep-dive material (multi-agent, RL, full CI wiring) is referenced, not taught.

---

## Learning outcomes

By the end of the session, each participant can:

1. Explain why static-locator automation is structurally brittle — and what "AI & I" changes.
2. Run an agentic test loop against a live emulator with a single plain-English goal.
3. Read an agent reasoning trace and identify low-confidence steps.
4. Break a selector, watch the healing loop patch it, and retry green.
5. Know where to plug this into CI.

---

## Schedule (180 min)

| Time | Block | Source chapter | Duration | Mode |
|------|-------|----------------|----------|------|
| 00:00 | **Opening** — The fragility problem & the shift to agentic testing | Ch1 | 15 min | Talk + discussion |
| 00:15 | **Architecture in one picture** — Appium · MCP · Agent · feedback loop | Ch2 | 15 min | Talk |
| 00:30 | **Setup & smoke test** — get everyone to a green environment | Ch3 | 25 min | Hands-on |
| 00:55 | **The agent's mind** — goals vs steps, DOM interpretation, planning | Ch4 | 20 min | Talk + demo |
| 01:15 | **Hands-on: the execution loop** — first agentic run with AppClaw | Ch5 | 30 min | Hands-on |
| 01:45 | *Break* | — | 10 min | ☕ |
| 01:55 | **Self-healing** — break → watch → heal → retry | Ch6 | 30 min | Hands-on |
| 02:25 | **Observability** — reasoning traces & confidence signals | Ch7 | 15 min | Demo |
| 02:40 | **End-to-end demo** — goal → locators → plan → spec → result | Ch8 | 15 min | Live demo |
| 02:55 | **CI + wrap-up + Q&A** — where this lives in CI, next steps | Ch9/10/11 | 5 min | Talk + Q&A |
| 03:00 | End | | | |

---

## Block-by-block plan

### 00:00 — Opening: the fragility problem (15 min)
*Full detail: WORKSHOP.md Chapter 1.*

- **Hook (5 min):** the 400-tests / 3-QA / 30–40%-on-broken-selectors story.
- **The three structural problems (5 min):** static locators in a moving UI, scripted steps for a reasoning problem, knowledge locked in people.
- **The shift (5 min):** old model vs new model table; land the "AI & I" framing.
- **Quick poll (kept short):** *"What % of your CI failures are selector mismatches vs real bugs?"*

### 00:15 — Architecture in one picture (15 min)
*Full detail: WORKSHOP.md Chapter 2.*

- Traditional pipeline vs agentic pipeline (the two diagrams).
- The four components: Appium (executor), MCP (orchestrator), LLM Agent (decision-maker), observability loop.
- One idea to anchor: **DOM interpretation ≠ DOM scraping.**
- *Cut for time:* the file-by-file architecture walk-through — point to `workshop/02-arch-foundations/examples/`.

### 00:30 — Setup & smoke test (25 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapter 3.*

> Pre-work e-mail should ask attendees to install tools **before** the session.
> Budget this block for fixing stragglers, not first-time installs.

- Verify toolchain: `node -v`, `pnpm -v`, `java -version`, `adb --version`, `claude --version`, `appclaw --version`.
- `pnpm install` + driver install.
- Configure `.env` (walk the key vars).
- Smoke test: `pnpm test` → expect 9 passing.
- Validate agentic stack: `appclaw "Open the Login screen"` → `✓ Navigated to Login screen`.
- **Checkpoint:** everyone raises a hand when green before moving on.

### 00:55 — The agent's mind (20 min)
*Full detail: WORKSHOP.md Chapter 4.*

- High-level goal vs low-level script (the comparison table).
- How the agent reads an accessibility tree and reasons about element identity.
- Planning one step at a time (the "Log in and verify home screen" trace).
- Error reasoning example: `email-input` → `input-email` rename.
- *Compressed:* run exercise 4a/4b as a 3-minute group think-aloud, not solo work.

### 01:15 — Hands-on: the execution loop (30 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapter 5.*

- The Think → Act → Observe loop diagram.
- **Everyone runs:** `appclaw "Log in with alice@example.com and 10203040 and verify I am logged in"`.
- DOM mode vs Vision mode — when to switch.
- Playground demo: `pnpm run claw:play` → record → `/export` to a YAML flow.
- YAML flows = deterministic, zero LLM cost: `pnpm run claw:flow flows/login.yaml`.
- Credentials via `.appclaw/env/` — never hardcode.
- *Referenced, not run:* The Bot / LambdaTest (Ch5 back half) — mention as the production path.

### 01:45 — Break (10 min) ☕

### 01:55 — Self-healing (30 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapter 6.*

- Three categories of fixable failure: rename, structural change, flow change.
- The healing loop: parse log → dump live DOM → Claude returns patch array → apply → retry.
- **Exercise 6 — Break → Watch → Heal:** attendees rename a selector, run, watch it heal, retry green.
- Adaptive navigation table (dialog / splash / wrong screen / loading).
- **Land the boundary:** self-healing is a resilience layer, *not* a cover for real regressions — do not heal functional bugs, changed business logic, or wrong assertions.

### 02:25 — Observability (15 min)
*Full detail: WORKSHOP.md Chapter 7.*

- Why agentic failures are non-deterministic (wrong action vs timing vs unfixed root cause vs ambiguous DOM).
- The four layers: reasoning traces → DOM signals → confidence scoring → failure-analysis issues.
- **Demo:** open a real reasoning trace, spot a low-confidence step, explain the fix.
- Takeaway: consistent low confidence across runs = flakiness candidate — fix the locator before it fails.

### 02:40 — End-to-end demo (15 min) — LIVE DEMO
*Full detail: WORKSHOP.md Chapter 8.*

- Speaker drives the full workflow live: **goal → inspect (`/appium-locators`) → plan → execute (WDIO + POM) → observe.**
- Hit the locator priority order (Accessibility ID → Resource ID → Text → structural XPath).
- Show the two patterns that save people: the **getter pattern** (never cache references) and drag-with-long-press gestures.

### 02:55 — CI, wrap-up & Q&A (5 min)
*Full detail: WORKSHOP.md Chapters 9–11.*

- One slide: two CI workflows — AppClaw YAML flows (no LLM, first gate) then WDIO specs (healing on failure).
- Where to go next: CI wiring, multi-agent, guardrails → point to Ch9/Ch10.
- Take 2–3 questions. Close.

---

## What was cut / compressed vs the full day

| Full-day chapter | 3-hour treatment |
|------------------|------------------|
| Ch1 Story | Compressed to 15 min |
| Ch2 Architecture | Kept core diagrams; file-by-file walk **cut** |
| Ch3 Setup | Kept, assumes pre-work install |
| Ch4 Agent's mind | Exercises done as group think-aloud |
| Ch5 Execution loop | Kept hands-on; Bot/LambdaTest **referenced only** |
| Ch6 Self-healing | Kept as primary hands-on exercise |
| Ch7 Observability | Compressed to a single demo |
| Ch8 E2E demo | Speaker-driven live demo, no solo exercise |
| Ch9 CI | Reduced to one summary slide |
| Ch10 Future | **Cut** — referenced for self-study |
| Ch11 Games | **Cut** — optional if time remains |

## Facilitator notes

- **Pre-work is mandatory.** Send the Chapter 3 install table 3–4 days ahead; the 25-min setup block assumes tools are already installed. **Critically, attendees must `ollama pull llama3.1` beforehand** — it's a ~4.7 GB download that will not finish during the session on conference Wi-Fi. No cloud LLM key is needed; the model runs locally.
- **Two checkpoints gate the session:** green smoke test (00:55) and a successful `appclaw` login run (01:45). Do not advance the room past a checkpoint with more than a couple of people stuck — pair them up.
- **If you're running behind,** drop the Playground recording sub-section (01:15) and the observability demo (02:25) first; keep setup and self-healing intact.
- **If you're ahead,** pull in one game from Chapter 11 (Locator Quiz, 8 min) before Q&A.
