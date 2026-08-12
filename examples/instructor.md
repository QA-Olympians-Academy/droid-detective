# Instructor Run-Book — how to run each chapter

Facilitator notes for the full-day workshop (AutomationSTAR schedule in
[workshop/README.md](../workshop/README.md)). Running the 3-hour cut instead?
Use [instructor-3h.md](instructor-3h.md). For every chapter: what to have
ready, exactly what to run, what to point at, and how to reset. This file
lives only on `main` — the branch build strips it from participant branches.

---

## Before the workshop (once, the day before)

```bash
pnpm install
pnpm run appium:install-driver          # uiautomator2 driver
# drop the demo app in place:
ls apps/demo.apk
# start + verify the emulator:
emulator -avd <your-avd> &
adb devices                             # expect: emulator-5554   device
# local model for ch6/ch9 (and $0-cost demos):
ollama pull llama3.1
# LLM for ch5 live runs — pick one:
export LLM_BASE_URL=https://openrouter.ai/api/v1 OPEN_ROUTER_API_KEY=sk-...
# export LLM_BASE_URL=http://localhost:11434/v1 LLM_API_KEY=ollama LLM_MODEL=qwen2.5
# first AppClaw run installs the CLI into .appclaw-cli (slow) — warm it now:
pnpm claw:flow flows/login.yaml
# rebuild + publish participant branches if examples changed:
PUSH=1 bash workshop/build-branches.sh
```

Smoke-test the three offline demos — they must work with zero infrastructure:

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts
node examples/ch06-self-healing/self-healer.js
pnpm exec ts-node examples/ch07-observability/run.ts
```

**Branch choreography.** Participants clone the repo and check out the branch
for wherever they join: `start/ch04` (start of hands-on) … `start/ch09`. Each
branch has earlier chapters complete and the current chapter onward stubbed
with `TODO(chN)` markers. Answers on demand:
`git checkout main -- examples/<chapter>`.

---

## Ch 1 — 09:00 · The Story Shift *(talk, 30 min)*

No code. Slides + one hook demo if you want it: open
[droid/pageobjects/main.page.ts](../droid/pageobjects/main.page.ts), rename one
selector, run `pnpm test`, and let the wall of red make the fragility argument
for you (`git checkout droid/pageobjects` to undo).

## Ch 2 — 09:30 · Architecture & Foundations *(talk, 30 min)*

Walk [workshop/02-arch-foundations/examples/architecture-overview.md](../workshop/02-arch-foundations/examples/architecture-overview.md)
against the live repo tree: `droid/` (classic WDIO suite), `bot/` (custom
agent), `flows/` (AppClaw YAML), `examples/` (per-chapter exercise code).
Message to land: same Appium underneath, three levels of autonomy on top.

## Ch 3 — 10:00 · Setup *(hands-on, 30 min)*

Goal: everyone green before the break. Run the verify column of the tools
table in [workshop/03-setup/README.md](../workshop/03-setup/README.md), then:

```bash
pnpm install && pnpm run appium:install-driver
adb devices                # emulator-5554 present
pnpm test                  # the classic suite passes end-to-end
```

Close with the two prompt-engineering samples in
`workshop/03-setup/examples/` (chain-of-thought, shot-prompting) — they are
referenced again in ch5 and ch6.

## Ch 4 — 10:30 · The Agent's Mind *(hands-on, 30 min · offline)*

```bash
pnpm exec ts-node examples/ch04-agent-mind/run.ts
```

Show the locator map first (ranked selectors per element), then the plan.
Point at the `~button-LOGIN` vs `~LOGIN-button` gotcha — it's annotated in the
sample XML the demo reads. Participants on `start/ch04` implement
`parseHierarchy` → `rankLocators` → `planGoal`; the runner prints their result
as soon as the TODOs stop throwing. Exercises: `workshop/04-agent-mind/exercises/`.

## Ch 5 — 11:00 · The Execution Loop *(hands-on, 45 min · emulator + LLM)*

Three escalating demos:

```bash
# 1. AppClaw natural-language run (exercise 5a):
pnpm claw "Open the Login screen"
# 2. Deterministic YAML replay of the same journey:
pnpm claw:flow flows/login.yaml
# 3. The loop itself, from source (what participants build):
pnpm exec ts-node examples/ch05-execution-loop/run.ts
```

Narrate demo 3 with the loop diagram: watch each `[ step N ]` line — Think
(tool calls chosen) → Act (outcome) → Observe (new page source). Participants
implement `loop.ts` and `executor.ts`; `tools.ts`, `llm.ts`, `run.ts` are
given. If a participant has no LLM key, pair them or point them at Ollama
(README in the example dir). Cloud-device variant: `pnpm bot` (needs
LambdaTest creds — instructor demo only).

## Ch 6 — 11:45 · Self-Healing *(hands-on, 30 min · offline)*

```bash
node examples/ch06-self-healing/self-healer.js
diff -r examples/ch06-self-healing/fixtures/pageobjects examples/ch06-self-healing/.healed
```

Walk the five pipeline steps in the output; the fixtures contain one rename
and one content-desc→resource-id move, so both healing categories fire.
Re-run with `--llm` (Ollama) to show the production approach and why the
validation gates exist — then show the full prompt engineering in
[workshop/06-self-healing/examples/heal-and-retry.js](../workshop/06-self-healing/examples/heal-and-retry.js).
Participants implement `extractFailedSelectors` and `proposePatchesHeuristic`.
The CI break-and-heal exercise (`exercise-6.md`) needs GitHub Actions — save
it for ch9 if time is tight.

## Ch 7 — 12:15 · Observability *(hands-on, 30 min · offline)*

```bash
pnpm exec ts-node examples/ch07-observability/run.ts
open examples/ch07-observability/trace-report.md
```

The punchline to say out loud: **the replayed run succeeded and still flags a
step** — observability finds the flake before it becomes a red build.
Participants implement `scoreConfidence`, `record`, `summary`; the report
renderer is given. Compare their output with
`workshop/07-observability/examples/reasoning-trace-example.md`.

*(Lunch 13:00)*

## Ch 8 — 13:45 · End-to-End Demo *(hands-on, 45 min · emulator)*

The full Inspect → Plan → Execute arc in one session:

```bash
# 1. INSPECT — locator discovery with the Claude Code skill:
/appium-locators apps/demo.apk
# 2. PLAN — paste the locator map + goal into Claude, get numbered steps
# 3. EXECUTE — the hardened artifact:
pnpm test -- --spec examples/ch08-e2e-demo/login.spec.ts
```

Participants fill in `login.page.ts` locators (from their own step-1 output)
and the four spec bodies. Emphasise what "production-quality" means — the
bullet list in `examples/ch08-e2e-demo/README.md`.

## Ch 9 — 14:30 · CI with GitHub Actions *(hands-on, 30 min · Ollama)*

Both helpers degrade to stdout without GitHub env vars, so they demo locally:

```bash
# stage a deliberately brittle selector first:
sed -i '' 's/~Login-tab/android.widget.LinearLayout[2]/' droid/pageobjects/main.page.ts
node examples/ch09-agent-ci/review-locators.js      # model flags it
git checkout droid/pageobjects                       # reset

node examples/ch09-agent-ci/analyse-failures.js      # needs any appium.log
```

Then map the pieces onto the two annotated workflows in
`workshop/09-ci-github/examples/` and run exercise-9a (fork + Actions). This
is where the ch6 break-and-heal exercise pays off end-to-end.

## Ch 10 — 15:00 · Future Outlook *(talk, 30 min)*

Slides only — `workshop/10-future-outlook/README.md`.

## Ch 11 — 15:30 · Q&A Games *(30 min)*

Three ready-made games in `workshop/11-qa-games/games/`: `locator-quiz.md`
(use the ch4 locator map as the answer sheet), `fix-the-test.md` (the ch6
fixtures make good rounds), `selector-bingo.md`. Quizzes per chapter are in
each `workshop/NN-*/quiz.json`.

---

## Reset between sessions

```bash
git checkout droid/pageobjects examples/          # undo live-demo damage
rm -rf examples/ch06-self-healing/.healed examples/ch07-observability/trace-report.md
git checkout main && bash workshop/build-branches.sh   # rebuild checkpoints
```

## Known gotchas

- `Cannot find module 'webdriverio'` on `pnpm bot` / ch5 runner → `pnpm add -D webdriverio` once.
- First `pnpm claw` run installs the CLI into `.appclaw-cli` (df-vision is
  vendored as a stub — see `scripts/appclaw.sh` header). Do it before the room fills.
- Root `.gitignore` ignores `*.log` — the ch6 fixture is `appium-failure.log`
  (explicitly un-ignored); don't rename it back to `appium.log`.
- Ollama on CPU is slow: for ch6 `--llm` and ch9, warm the model
  (`ollama run llama3.1 ''`) before the demo.
