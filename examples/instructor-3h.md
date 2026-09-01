# Instructor Run-Book — 3-hour workshop

Facilitator notes for the 3-hour cut ([docs/WORKSHOP-3H.md](../docs/WORKSHOP-3H.md)
is the agenda; [docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) has the student
prerequisites, pre-flight checklist, and troubleshooting table — this file does
not repeat them). For every block: exactly what to run, what to point at, and
how to reset. Like [instructor.md](instructor.md) (the full-day run-book) and
[instructor-90m.md](instructor-90m.md) (the 90-minute cut), this file lives
only on `main` — the branch build strips it from participant branches.

**The 3-hour format is fully local: Ollama + llama3.1, no cloud LLM key.**

---

## Before the workshop (once, the day before)

```bash
pnpm install
pnpm run appium:install-driver          # uiautomator2 driver
ls apps/demo.apk                        # demo app in place (PLAYBOOK-3H §0.6 to fetch)
# AVD: reuse one from `emulator -list-avds`, or create it (PLAYBOOK-3H §0.8 step 0):
# echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
#   -n workshop_avd -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6 --force
emulator -avd workshop_avd &            # boot + verify
adb devices                             # expect: emulator-5554   device
ollama pull llama3.1 && ollama run llama3.1 ''   # pull AND warm the local model
# AppClaw CLI is a global install — verify it, then smoke the flow:
appclaw --version || npm i -g @appclaw/cli
pnpm claw:flow flows/login.yaml
```

Smoke-test the demos you'll run live — in schedule order:

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts        # 00:55 demo (offline)
pnpm test                                                # 00:30 gate + ch6 baseline
node .github/scripts/heal-and-retry.js                   # 01:55 dry-run (see below)
pnpm exec ts-node examples/ch07-observability/run.ts     # 02:25 demo (offline)
```

Unlike the full day, the `start/chNN` branches are **not required** — the two
hands-on blocks (ch5, ch6) run commands against the repo as-is rather than
implementing stubs. Keep the branches published anyway: they're the take-home
exercise path you point at in the wrap-up.

---

## 00:00 — Opening: the fragility problem *(talk, 15 min · Ch1)*

No code required. Optional hook demo: open
[droid/pageobjects/main.page.ts](../droid/pageobjects/main.page.ts), rename one
selector, run `pnpm test`, let the wall of red make the argument
(`git checkout droid/pageobjects` to undo). Keep the poll to one minute.

## 00:15 — Architecture in one picture *(talk, 15 min · Ch2)*

The two pipeline diagrams from
[workshop/02-arch-foundations/examples/architecture-overview.md](../workshop/02-arch-foundations/examples/architecture-overview.md).
The file-by-file repo walk is **cut** in this format — just name the four
directories once: `droid/` (classic WDIO), `bot/` (custom agent), `flows/`
(AppClaw YAML), `examples/` (per-chapter code).

## 00:30 — Setup & smoke test *(hands-on, 25 min · Ch3)*

Do **not** teach installation — pre-work (PLAYBOOK-3H §0) is mandatory. Run the
§0.8 pre-flight live and walk the room:

```bash
adb devices                          # emulator-5554  device
curl -s http://localhost:11434/api/tags >/dev/null && echo "✓ ollama up"
pnpm test                            # suite starts, app installs, specs run
pnpm claw "Open the Login screen"    # ✓ Navigated to Login screen
```

**Checkpoint 1 — gate everything on this.** Hands up when green; pair anyone
stuck with a neighbour. More than two red → spare machine / cloud VM, keep moving.

## 00:55 — The agent's mind *(talk + demo, 20 min · Ch4)*

Instructor-driven in this format (participants don't implement the stubs):

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts
```

Show the locator map first (ranked selectors per element), then the plan.
Point at the `~button-LOGIN` vs `~LOGIN-button` gotcha in the sample XML.
Run exercises 4a/4b from `workshop/04-agent-mind/exercises/` as a 3-minute
group think-aloud, not solo work.

## 01:15 — Hands-on: the execution loop *(30 min · Ch5)*

Everyone runs one agentic loop, then sees the deterministic replay:

```bash
# 1. natural-language agentic run (everyone):
pnpm claw "Log in with alice@example.com and 10203040 and verify I am logged in"
# 2. playground: record → /export to YAML (demo, drop first if behind):
pnpm run claw:play
# 3. deterministic YAML replay — zero LLM cost:
pnpm run claw:flow flows/login.yaml
```

Narrate the per-step ✓/✗ log with the Think → Act → Observe diagram; show
DOM mode vs Vision mode; land credentials-via-`.appclaw/env/` in one sentence.
The Bot / LambdaTest path is **referenced only** — mention `pnpm bot` as the
cloud-device variant and move on.

**Checkpoint 2:** everyone completed one `appclaw` or flow run before the break.

## 01:45 — Break (10 min) ☕

Use it to reset your machine for the centrepiece: `git status` clean,
emulator alive, Ollama warm.

## 01:55 — Self-healing *(hands-on, 30 min · Ch6 — the centrepiece)*

Live break → heal against the real suite (not the offline fixture demo):

```bash
# 1. attendees rename a selector in a page object, e.g.
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
guardrails, not the model. Run it twice to show the retry loop absorbing
format variance. If the emulator misbehaves, fall back to the offline demo:
`node examples/ch06-self-healing/self-healer.js`.

**Land the boundary:** healing is a resilience layer, **not** a cover for real
regressions.

**Checkpoint 3:** everyone watched (or ran) a heal go green.

## 02:25 — Observability *(demo, 15 min · Ch7)*

```bash
pnpm exec ts-node examples/ch07-observability/run.ts
open examples/ch07-observability/trace-report.md
```

The punchline to say out loud: **the replayed run succeeded and still flags a
step** — observability finds the flake before it becomes a red build. Compare
with `workshop/07-observability/examples/reasoning-trace-example.md`.
This block is the second thing to drop if you're behind (after the playground).

## 02:40 — End-to-end demo *(live demo, 15 min · Ch8)*

Speaker-driven — no solo exercise in this format:

```bash
# 1. INSPECT — locator discovery with the Claude Code skill:
/appium-locators apps/demo.apk
# 2. PLAN — paste the locator map + goal into Claude, get numbered steps
# 3. EXECUTE — the hardened artifact:
pnpm test -- --spec examples/ch08-e2e-demo/login.spec.ts
```

Hit the locator priority order (Accessibility ID → Resource ID → Text →
structural XPath) and the getter pattern (never cache element references).

## 02:55 — CI, wrap-up & Q&A *(5 min · Ch9–11)*

One slide: AppClaw YAML flows (zero-LLM) as the first CI gate, then WDIO specs
with healing inside the emulator job — point at
`.github/workflows/android-tests.yml`. For self-study: the `start/chNN`
branches ([examples/README.md](README.md)) and the ch9 helpers
(`node examples/ch09-agent-ci/review-locators.js`). Take 2–3 questions. Close.

**If you're ahead:** one game from `workshop/11-qa-games/games/locator-quiz.md`
(8 min) before Q&A, using the ch4 locator map as the answer sheet.

---

## Reset between sessions

```bash
git checkout droid/pageobjects examples/          # undo live-demo damage
rm -rf examples/ch06-self-healing/.healed examples/ch07-observability/trace-report.md
```

## Gotchas

The full troubleshooting table (every failure was hit for real) is in
[docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) §4. The three that bite mid-session:

- Ollama's first call loads the model into RAM and looks like a hang — warm it
  (`ollama run llama3.1 ''`) before 00:30 and again during the break.
- AppClaw is a global install (`npm i -g @appclaw/cli`) — verify
  `appclaw --version` the day before, not at 01:15.
- Healer prints "no parseable patch" — expected occasionally with an 8B model;
  the script retries 5×, just re-run.
