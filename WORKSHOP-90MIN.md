# Test Smarter, Not Harder — 90-Minute Workshop

**Speaker:** Ioannis Papadakis · Snappi
**Level:** Intermediate
**Stack:** Claude Code · Appium · WebdriverIO · AppClaw
**Format:** 90 minutes · no break · one core hands-on exercise

> The tightest useful cut. In 90 minutes we do exactly one thing well:
> get every participant to run the **Think → Act → Observe** agentic loop on a
> live screen, then **break a selector and watch it self-heal.** Everything else
> is framing or reference.

---

## Learning outcomes

By the end, each participant can:

1. Say why static-locator automation is structurally brittle — the "AI & I" shift.
2. Run an agentic test loop against a live emulator from a plain-English goal.
3. Break a selector, watch the healing loop patch it, and retry green.

---

## Schedule (90 min)

| Time | Block | Source chapter | Duration | Mode |
|------|-------|----------------|----------|------|
| 00:00 | **Why agentic** — fragility problem & the shift | Ch1 | 10 min | Talk |
| 00:10 | **Architecture in one picture** — Appium · MCP · Agent · loop | Ch2 | 10 min | Talk |
| 00:20 | **Setup check** — everyone to a green environment | Ch3 | 15 min | Hands-on |
| 00:35 | **The execution loop** — first agentic run with AppClaw | Ch4/5 | 30 min | Hands-on |
| 01:05 | **Self-healing** — break → watch → heal → retry | Ch6 | 20 min | Hands-on |
| 01:25 | **Wrap-up & Q&A** — observability + CI in one slide each | Ch7/9 | 5 min | Talk |
| 01:30 | End | | | |

---

## Block-by-block plan

### 00:00 — Why agentic (10 min)
*Full detail: WORKSHOP.md Chapter 1.*

- The 400-tests / 3-QA / 30–40%-on-broken-selectors story (3 min).
- Three structural problems: static locators, scripted steps for a reasoning problem, knowledge locked in people (4 min).
- The shift — old model vs new model, land **"AI & I"** (3 min).

### 00:10 — Architecture in one picture (10 min)
*Full detail: WORKSHOP.md Chapter 2.*

- Traditional pipeline vs agentic pipeline (the two diagrams).
- The four components in one line each: Appium executes, MCP orchestrates, the LLM decides, observability feeds back.
- One idea to keep: **DOM interpretation ≠ DOM scraping.**

### 00:20 — Setup check (15 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapter 3.*

> **Install is mandatory pre-work.** This block is for fixing stragglers, not first installs.

- Verify: `appclaw --version`, `adb devices` (emulator online), `.env` in place.
- Smoke test: `appclaw "Open the Login screen"` → `✓ Navigated to Login screen`.
- **Checkpoint:** hands up when green. Pair anyone stuck with a neighbour.

### 00:35 — The execution loop (30 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapters 4–5.*

- Goal vs script: intent, not steps (2 min, the comparison table).
- The Think → Act → Observe loop diagram (3 min).
- **Everyone runs:** `appclaw "Log in with alice@example.com and 10203040 and verify I am logged in"` (10 min — run, read the per-step ✓/✗ log).
- Read one agent reasoning trace together — spot the DOM interpretation (5 min).
- YAML flows = deterministic, zero LLM cost: `pnpm run claw:flow flows/login.yaml` (5 min).
- Credentials via `.appclaw/env/` — never hardcode (2 min).
- Buffer / help (3 min).

### 01:05 — Self-healing (20 min) — HANDS-ON
*Full detail: WORKSHOP.md Chapter 6.*

- Three categories of fixable failure: rename, structural change, flow change (3 min).
- The healing loop: parse log → dump live DOM → Claude returns patch → apply → retry (2 min).
- **Exercise 6 — Break → Watch → Heal:** rename a selector, run, watch it heal, retry green (12 min).
- The boundary: healing is a resilience layer, **not** a cover for real regressions (3 min).

### 01:25 — Wrap-up & Q&A (5 min)
*Full detail: WORKSHOP.md Chapters 7, 9, 10.*

- Observability in one line: reasoning traces + confidence scoring surface flaky steps before they fail.
- CI in one line: AppClaw YAML flows (no LLM) as first gate, then WDIO specs with healing on failure.
- Point to the full course for E2E, CI wiring, multi-agent. Take 1–2 questions. Close.

---

## What was cut vs the 3-hour version

| Block | 90-min treatment |
|-------|------------------|
| Agent's mind (Ch4) | Folded into the execution-loop block |
| Playground recording (Ch5) | **Cut** |
| The Bot / LambdaTest (Ch5) | **Cut** — referenced only |
| Observability (Ch7) | Reduced to one sentence |
| End-to-end live demo (Ch8) | **Cut** |
| CI integration (Ch9) | Reduced to one sentence |
| Future Outlook + Games (Ch10/11) | **Cut** |

## Facilitator notes

- **Pre-work is non-negotiable.** With only 15 min for setup, anyone who hasn't installed the toolchain and booted an emulator beforehand cannot participate. Send the Chapter 3 install table, a "boot your emulator before you arrive" instruction, and — most importantly — **`ollama pull llama3.1` (a ~4.7 GB download)**. No cloud LLM key is needed; the agent runs on a local model.
- **Two hands-on blocks carry the whole session** (00:35 and 01:05). Protect their time — if the room falls behind, cut the YAML-flow and reasoning-trace sub-sections from the loop block first; keep the live `appclaw` run and the heal exercise intact.
- **One checkpoint gates everything:** the green `appclaw "Open the Login screen"` at 00:35. Do not start the loop block with more than a couple of people red.
