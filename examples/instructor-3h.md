# Instructor Run-Book — 3-hour workshop

Facilitator notes for the 3-hour cut ([docs/WORKSHOP-3H.md](../docs/WORKSHOP-3H.md)
is the agenda; [docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) has the student
prerequisites, pre-flight checklist, and troubleshooting table — this file does
not repeat them). For every block: exactly what to run, what to point at, and
how to reset. See also [instructor.md](instructor.md) (the full-day run-book) and
[instructor-90m.md](instructor-90m.md) (the 90-minute cut).

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
ollama pull llama3.1 && ollama run llama3.1 "hi"   # pull AND warm the local model
# AppClaw CLI is a global install — verify it, then smoke the flow:
appclaw --version || npm i -g @appclaw/cli
pnpm claw:flow flows/login.yaml
```

Smoke-test the demos you'll run live — in schedule order:

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts        # 00:55 demo (offline)
pnpm test                                                # 00:30 gate + ch6 baseline
# 01:55 dry-run — break the selector first (see below), then:
WDIO_EXCLUDE=specs/example.spec.ts node .github/scripts/heal-and-retry.js
pnpm exec ts-node examples/ch07-observability/run.ts     # 02:25 demo (offline)
```

Everything runs from `main`: the two hands-on blocks (ch5, ch6) run commands
against the repo as-is, and every example is complete.

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
appclaw doctor                       # ✓ Config valid — model llama3.1 · ✓ 1 device(s) connected
```

Validate the agentic stack with `appclaw doctor`, **not** an `appclaw "goal"`
run: on llama3.1 a goal run reports PASSED whether or not anything happened
(see 01:15), so it proves nothing at the gate.

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

The room runs the deterministic flow; the agentic goal is **instructor-driven**:

```bash
# 1. everyone — deterministic YAML flow, zero LLM, ~15 s, 10/10 steps:
pnpm run claw:flow flows/login.yaml
# 2. instructor — the same journey as one plain-English goal (recording, or live):
pnpm claw "Log in with alice@example.com and 10203040 and verify I am logged in"
# 3. playground: record → /export to YAML (demo, drop first if behind).
#    Opens in step-recording mode — `/mode goal` to type goal sentences instead:
pnpm run claw:play
```

**Why the room doesn't run the goal (dry run, 2 Nov):** on llama3.1 AppClaw's
goal mode reports *"✓ 5 passed 5/5 100%"* while nothing was typed or tapped —
the model writes its tool call as prose ("I will use find_and_click…"), and
AppClaw counts the unverified `done` as a pass. "Open the Login screen" printed
`VERIFICATION FAILED` and then `✓ PASSED`. qwen2.5:32b does the login for real
but needed 31 min. Show a recording of the real run; if you show the llama3.1
run live (~5 min), use it as the lesson: **a green the agent reports is not
evidence** — the deterministic flow and the healer's DOM guard are.

Narrate the per-step ✓/✗ log with the Think → Act → Observe diagram; show
DOM mode vs Vision mode; land credentials-via-`.appclaw/env/` in one sentence.
The Bot / LambdaTest path is **referenced only** — mention `pnpm bot` as the
cloud-device variant and move on.

**Checkpoint 2:** everyone ran `flows/login.yaml` to *✓ All steps passed* before the break.

## 01:45 — Break (10 min) ☕

Use it to reset your machine for the centrepiece: `git status` clean,
emulator alive, Ollama warm.

## 01:55 — Self-healing *(hands-on, 30 min · Ch6 — the centrepiece)*

Live break → heal against the real suite (not the offline fixture demo):

```bash
# 1. attendees play the developer who moved the carousel's id from content-desc
#    to resource-id — the test still uses the old accessibility id. In
#    droid/pageobjects/swipe.page.ts set the carousel getter to:
#        return $('~Carousel')
pnpm test                                # swipe tests fail; afterTest snapshots the DOM
WDIO_EXCLUDE=specs/example.spec.ts node .github/scripts/heal-and-retry.js
git checkout droid/pageobjects/swipe.page.ts   # reset after
```

Narrate the five steps as they scroll: detect failed selector → read the
failure-time DOM snapshot → ask llama3.1 → validate (compiles, only-failing
selector, target exists in the DOM) → apply & retry. Expected output (dry run,
2 Nov — ~85 s for heal + retry):

```
✎ override: model proposed "//android.widget.FrameLayout[@resource-id="Carousel"]",
  but the DOM has an exact name match for "~Carousel" — using "//*[@resource-id="Carousel"]"
✓ patched swipe.page.ts: "~Carousel" → "//*[@resource-id="Carousel"]"
✅ Tests passed after self-healing
```

**Teaching point — point at the `✎ override` line:** llama3.1 got the element
right and the class wrong (the node is a `ViewGroup`, not a `FrameLayout`). A
blind patch would have stayed red; the guard checked the DOM and replaced it
with the ground truth. *The LLM proposes, the validators dispose* — live.

**Do not use a `~Carousel-BROKEN` style break.** No node carries that name, so
only the model can fix it — and llama3.1 proposed the same FrameLayout xpath
5/5 times, rejected 5/5 (temperature 0: re-running doesn't help). If the
emulator misbehaves, fall back to the offline demo:
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

## 02:40 — AppClaw skills demo *(live demo, 15 min · Ch8)*

Speaker-driven — no solo exercise in this format:

```bash
# 1. GENERATE — in Claude Code from the project root, with the Part A request from
#    workshop/08-appclaw-skills/exercises/exercise-8.md:
/generate-appclaw-flow  <request>            # stop at the plan, room approves
# 2. RUN — twice, the second time strict:
pnpm run claw:flow flows/forms-text.yaml
appclaw --flow flows/forms-text.yaml --strict
# 3. DIAGNOSE — misspell a label, paste the failure into /use-appclaw-cli
```

Hit what the skill cannot know (accessibility ids, success text: run a weak request
first and let `--strict` fail on the guessed step) and the operator skill's safety
line (`--flow` runs freely, any goal run asks first). Reference answers:
`examples/ch08-appclaw-skills/`.

## 02:55 — CI, wrap-up & Q&A *(5 min · Ch9–11)*

One slide: AppClaw YAML flows (zero-LLM) as the first CI gate, then WDIO specs
with healing inside the emulator job — point at
`.github/workflows/android-tests.yml`. For self-study: the complete examples
([examples/README.md](README.md)) and the ch9 helpers
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
[docs/PLAYBOOK-3H.md](../docs/PLAYBOOK-3H.md) §4. The ones that bite mid-session:

- Ollama's first call loads the model into RAM and looks like a hang — warm it
  (`ollama run llama3.1 "hi"`) before 00:30 and again during the break.
- An `appclaw "goal"` run on llama3.1 says PASSED regardless of the outcome —
  never use one as a checkpoint; `appclaw doctor` and `claw:flow` are the gates.
- AppClaw is a global install (`npm i -g @appclaw/cli`) — verify
  `appclaw --version` the day before, not at 01:15.
- Healer prints "no parseable patch" — expected occasionally with an 8B model;
  the script retries 5×, just re-run.
