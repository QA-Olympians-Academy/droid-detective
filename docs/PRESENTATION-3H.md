---
marp: true
theme: default
paginate: true
---

<!-- _class: title -->
<!-- paginate: false -->

# Test Smarter, Not Harder

## Agentic Mobile QA in Practice — 3-Hour Workshop

Ioannis Papadakis · Snappi

Claude Code · Appium · WebdriverIO · AppClaw · Ollama

Fully local · no cloud LLM key

---

## What you'll learn

- Why static-locator automation is structurally **brittle** — and what "AI & I" changes
- Run an **agentic test loop** on a live emulator from a plain-English goal
- Read an agent **reasoning trace** and spot low-confidence steps
- **Break a selector, watch it self-heal**, and retry green
- Where this plugs into **CI** — free and keyless with local models

---

## Before you arrive — prerequisites

The setup is heavy (multi-GB downloads + an emulator). Do this **before** the session — the in-session setup block is for fixing stragglers, not first installs.

| Tool | Verify command |
|------|----------------|
| Node 20+ / pnpm 10 | `node -v` · `pnpm -v` |
| JDK 17 | `java -version` |
| Android SDK + build-tools 34 + emulator | `adb --version` · `emulator -version` |
| Appium 3 + UiAutomator2 driver | `appium --version` |
| Ollama | `ollama --version` |
| AppClaw CLI (pinned) | `appclaw --version` |

- Pull the model: `ollama pull llama3.1` (~4.9 GB)
- Download the demo app to `apps/demo.apk` (WebdriverIO native demo app)
- Copy `.env.example` → `.env` (defaults to Ollama — **no cloud key needed**)
- **Smoke test:** boot the emulator + `pnpm test` runs → you're ready

---

## Agenda — 180 minutes

| Time | Block | Mode |
|------|-------|------|
| 00:00 | Opening — the fragility problem & the shift | Talk |
| 00:15 | Architecture in one picture | Talk |
| 00:30 | Setup & smoke test | Hands-on |
| 00:55 | The agent's mind | Talk + demo |
| 01:15 | The execution loop | Hands-on |
| 01:45 | Break | ☕ |
| 01:55 | Self-healing | Hands-on |
| 02:25 | Observability | Demo |
| 02:40 | End-to-end demo | Live |
| 02:55 | CI + wrap-up + Q&A | Talk |

---

<!-- _class: title -->

# Why Agentic?

## The fragility problem

---

## Static locators in a moving UI

Consider a typical team: 400 tests, weekly UI releases, QA spending 30–40% of every sprint on broken selectors. The tests weren't wrong. The automation was **structurally brittle**.

### Three structural problems

- **Static locators in a moving UI** — a rename breaks 47 tests overnight. No real regression, just noise.
- **Scripted steps for a reasoning problem** — a dialog appears; the script has no way to adapt.
- **Knowledge locked in people** — timing quirks and launch states leave when the engineer does.

---

## The shift: "AI & I"

Agents handle mechanical adaptation. Engineers handle goals, strategy, and judgement.

| Old model | New model |
|-----------|-----------|
| Write selectors manually | Agent discovers selectors from the live DOM |
| Fix broken selectors manually | Agent patches selectors on failure |
| Test = sequential steps | Goal = intent, agent plans the steps |
| CI failure needs a human | CI failure triggers a healing loop |
| Knowledge locked in people | Knowledge encoded in prompts & skills |

---

<!-- _class: title -->

# Architecture

## Appium · MCP · Agent · Feedback loop

---

## The four components

- **Appium** — the low-level executor; translates commands to UiAutomator2. Unchanged from classic automation.
- **MCP** — the orchestrator; a typed tool interface between the model and Appium.
- **LLM Agent** — the decision-maker; given goal + DOM + history, produces a reasoning trace and a tool call.
- **Observability loop** — captures traces, action logs, and confidence signals.

### One idea to keep

- **DOM interpretation ≠ DOM scraping** — the agent reasons about element *role*, not string matches.

---

<!-- _class: demo -->

## The execution loop — Think → Act → Observe

The model reasons about the current DOM, calls a tool, observes the new state, and repeats until the goal is met.

```bash
# one plain-English goal → the agent drives a real device
appclaw "Log in with demo@wdio.dev / Password123! and verify I am logged in"

# deterministic, zero-LLM path for CI
pnpm run claw:flow flows/login.yaml
```

- **DOM mode** — reads the accessibility tree (fast, standard apps)
- **Vision mode** — reads a screenshot (games, custom renderers)

---

<!-- _class: title -->

# Self-Healing

## Break → Heal → Green

---

## The healing loop

When a selector fails, the agent doesn't just report red — it tries to fix it.

### Steps

- Detect the **genuinely failed** selector from the run log
- Read the **failure-time DOM** of the screen it failed on
- Ask a **local model** for a corrected selector
- **Validate**, apply the patch, and retry

### Three fixable failures

- **Rename** — `~email-input` → `~input-email`
- **Strategy change** — `~Carousel` → `//*[@resource-id="Carousel"]`
- **Flow change** — a new dialog appears mid-flow

---

## The guardrail model

The model is non-deterministic — so it proposes, and **the validators dispose.** A patch is applied only if it:

- targets a selector that **actually failed** (never a working one)
- is a **valid** selector string (no broken quotes)
- keeps the file **compiling**
- has a target that **actually exists in the captured DOM** (no hallucinated ids)

**Bad suggestion → rejected, never applied. No corruption, no false green.**

---

<!-- _class: demo -->

## Local & free: Ollama + llama3.1

No Anthropic/OpenAI key anywhere — the agent, healing, and analysis all run on a local model.

```env
LLM_PROVIDER=ollama
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
```

- Workshop laptops: **llama3.1** (4.9 GB, runs on 16 GB RAM)
- CI runners (CPU, shared with emulator): a lighter **llama3.2:3b** to avoid OOM
- Want higher quality? Point `LLM_BASE_URL` at any OpenAI-compatible endpoint

---

## Observability — explain the agent's decisions

In agentic automation, "failed" can mean wrong action, bad timing, unfixed root cause, or an ambiguous DOM. Observability tells them apart.

### Four layers

- **Reasoning traces** — what the agent saw, concluded, decided
- **DOM signals** — accessibility-ID coverage, which screen, DOM quality
- **Confidence scoring** — selector type, waits, retries → flakiness candidates
- **Failure analysis** — a structured issue with root cause + suggested fix

---

## CI: heal → push → review

The pipeline is the same loop, automated end-to-end:

- **AppClaw YAML flows** — zero-LLM first gate: fast, free, deterministic
- **WebdriverIO specs** — self-heal runs **inside** the emulator job (live device for the DOM dump + retry)
- **Healer pushes the patch** to the PR branch — the fix lands for humans to see
- **Locator reviewer** comments on the healed selector — brittleness, best practice

---

## Checkpoints & facilitator tips

### Three gates — don't advance the room past a red one

- **00:55** — everyone: `emulator-5554 device` + `pnpm test` runs
- **01:45** — everyone ran one `appclaw` / flow loop
- **02:25** — everyone watched a heal go green

### If you're behind

- Drop the Playground recording and the observability demo first; keep setup + self-healing intact

---

## Troubleshooting — the top hits

| Symptom | Fix |
|---------|-----|
| `Could not find 'aapt2'` | install `build-tools;34.0.0` |
| `npm i -g appclaw` 404 on df-vision | pin `appclaw@1.9.3` |
| `adb: no devices` | boot the emulator; `adb kill-server && adb start-server` |
| Emulator dead-slow | Apple Silicon → `arm64-v8a` image; Intel/CI → enable KVM |
| Healer "no parseable patch" | 8B format variance — it retries 5×; re-run |

---

<!-- paginate: false -->

## What you'll walk away with

- A local Android emulator running a real WebdriverIO suite
- One **agentic** loop driven on a real device by **local llama3.1** — no cloud key
- A broken selector **self-healed** to green, in front of you
- The mental model: **the LLM proposes, the validators dispose** — and where it lives in CI

---

<!-- paginate: false -->

## Thank You

Questions? Let's talk — and play the locator games.

Ioannis Papadakis · Snappi
