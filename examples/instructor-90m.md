# Instructor Run-Book — 90-minute workshop

Facilitator notes for the 90-minute cut ([docs/WORKSHOP-90MIN.md](../docs/WORKSHOP-90MIN.md)
is the agenda; [docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) still applies for
student prerequisites, pre-flight checklist, and the troubleshooting table —
the toolchain is identical). For every block: exactly what to run, what to
point at, and how to reset. Like [instructor.md](instructor.md) and
[instructor-3h.md](instructor-3h.md), this file lives only on `main` — the
branch build strips it from participant branches.

**Fully local: Ollama + llama3.1, no cloud LLM key. No break, one checkpoint
gates everything, two hands-on blocks carry the session.**

---

## Before the workshop (once, the day before)

```bash
pnpm install
pnpm run appium:install-driver          # uiautomator2 driver
ls apps/demo.apk                        # demo app in place (PLAYBOOK-3H §0.6 to fetch)
emulator -avd workshop_avd &            # boot + verify
adb devices                             # expect: emulator-5554   device
ollama pull llama3.1 && ollama run llama3.1 ''   # pull AND warm the local model
# first AppClaw run installs the CLI into .appclaw-cli (slow) — warm it now:
pnpm claw:flow flows/login.yaml
```

Smoke-test the two live runs — with 90 minutes there is no slack to debug
on stage:

```bash
pnpm claw "Log in with alice@example.com and 10203040 and verify I am logged in"   # 00:35 run
pnpm test                                # ch6 baseline; afterTest snapshots the DOM
node .github/scripts/heal-and-retry.js   # 01:05 dry-run against a staged break
```

The `start/chNN` branches are **not used** in this format — nobody implements
stubs. Keep them published: they're the take-home path in the wrap-up.

**Send the pre-work reminder 48h out.** With only 15 minutes of setup time,
anyone without an installed toolchain, a booted emulator, and a pulled
llama3.1 (~4.7 GB) cannot participate. PLAYBOOK-3H §0 is the checklist.

---

## 00:00 — Why agentic *(talk, 10 min · Ch1)*

Slides only. The wall-of-red hook demo from the longer formats is **cut** —
a full `pnpm test` run costs most of the block. If you want the moment
anyway, open [droid/pageobjects/main.page.ts](../droid/pageobjects/main.page.ts),
rename one selector, and *describe* what CI would do — don't run it.
Land the three structural problems and the **"AI & I"** shift; skip the poll.

## 00:10 — Architecture in one picture *(talk, 10 min · Ch2)*

The two pipeline diagrams from
[workshop/02-arch-foundations/examples/architecture-overview.md](../workshop/02-arch-foundations/examples/architecture-overview.md)
and nothing else. Name the four directories once — `droid/` (classic WDIO),
`bot/` (custom agent), `flows/` (AppClaw YAML), `examples/` (per-chapter
code) — and land **DOM interpretation ≠ DOM scraping**.

## 00:20 — Setup check *(hands-on, 15 min · Ch3)*

Do **not** teach installation — pre-work is mandatory. Run the pre-flight
live and walk the room:

```bash
adb devices                          # emulator-5554  device
curl -s http://localhost:11434/api/tags >/dev/null && echo "✓ ollama up"
pnpm claw "Open the Login screen"    # ✓ Navigated to Login screen
```

Unlike the 3-hour format, `pnpm test` is **not** part of the gate — the smoke
run is the `appclaw` line alone. **Checkpoint — gate everything on this.**
Hands up when green; pair anyone stuck with a neighbour. More than two red →
spare machine / cloud VM, keep moving. Do not start the loop block with more
than a couple of people red.

## 00:35 — The execution loop *(hands-on, 30 min · Ch4+5)*

The ch4 agent's-mind demo is folded in here: open with the Think → Act →
Observe loop diagram (3 min), goal vs script in one comparison (2 min), then
everyone runs:

```bash
# 1. natural-language agentic run (everyone, ~10 min with help):
pnpm claw "Log in with alice@example.com and 10203040 and verify I am logged in"
# 2. deterministic YAML replay — zero LLM cost:
pnpm claw:flow flows/login.yaml
```

Between the two runs, read one agent reasoning trace together off a
participant's terminal — spot the DOM interpretation, point at the ranked
locator choice (the ch4 material in 5 minutes). Land credentials-via-
`.appclaw/env/` in one sentence. Playground recording (`pnpm claw:play`) and
the Bot / LambdaTest path are **cut** — mention `pnpm bot` exists and move on.

**If the room falls behind, drop the YAML replay and the trace read-along
first; the live `appclaw` run and the ch6 heal are untouchable.**

**Checkpoint 2:** everyone completed one `appclaw` run before 01:05.

## 01:05 — Self-healing *(hands-on, 20 min · Ch6 — the centrepiece)*

Same live break → heal as the 3-hour format, compressed: demo it on the
projector while attendees follow on their machines (with 20 minutes, running
it yourself beats waiting for the whole room):

```bash
# 1. rename a selector in a page object, e.g.
#    droid/pageobjects/swipe.page.ts:  ~Carousel → ~Carousel-BROKEN
pnpm test                                # swipe tests fail; afterTest snapshots the DOM
node .github/scripts/heal-and-retry.js   # local llama3.1 proposes, guardrails dispose
git checkout droid/pageobjects           # reset after
```

Narrate the five steps as they scroll: detect failed selector → read the
failure-time DOM snapshot → ask llama3.1 → validate (compiles, only-failing
selector, target exists in the DOM) → apply & retry. Expected end state:
`✓ patched … → //*[@resource-id="Carousel"]` then `✅ Tests passed after self-healing`.

**Teaching point:** the 8B model is non-deterministic — the value is the
guardrails, not the model. **Land the boundary:** healing is a resilience
layer, **not** a cover for real regressions.

Emulator misbehaving? Fall back to the offline demo — it needs nothing:
`node examples/ch06-self-healing/self-healer.js`.

**Checkpoint 3:** everyone watched a heal go green.

## 01:25 — Wrap-up & Q&A *(5 min · Ch7/9)*

One sentence each, one slide total:

- **Observability:** reasoning traces + confidence scoring surface flaky
  steps before they fail — `examples/ch07-observability/` to self-study.
- **CI:** AppClaw YAML flows (zero-LLM) as the first gate, then WDIO specs
  with healing inside the emulator job — `.github/workflows/android-tests.yml`.

For self-study: the `start/chNN` branches ([examples/README.md](README.md))
and the full-day agenda in [workshop/README.md](../workshop/README.md).
Take 1–2 questions. Close.

---

## Reset between sessions

```bash
git checkout droid/pageobjects examples/          # undo live-demo damage
rm -rf examples/ch06-self-healing/.healed
```

## Gotchas

The full troubleshooting table is in [docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) §4.
The three that bite in this format:

- Ollama's first call loads the model into RAM and looks like a hang — warm it
  (`ollama run llama3.1 ''`) right before 00:00; there is no break to recover in.
- First `pnpm claw` run installs the CLI into `.appclaw-cli` — do it the day
  before, not at 00:20.
- Healer prints "no parseable patch" — expected occasionally with an 8B model;
  the script retries 5×, just re-run. Budget one retry into the 20 minutes.
