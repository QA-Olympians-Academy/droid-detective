# Exercise 8 — Generate, Break and Repair a Flow with Skills, Then Write Your Own

**Time:** 20 minutes  
**Prerequisites:** emulator running (`adb devices` shows `emulator-5554   device`), `appclaw doctor` all green, Claude Code open in the project root, Chapter 5's `flows/login.yaml` passing

---

## Part A — Generate a flow with `/generate-appclaw-flow` (7 min)

Chapter 5's bonus asked you to record `flows/forms-text.yaml` by hand in the playground. This time the skill writes it.

In Claude Code:

```
/generate-appclaw-flow

App: com.wdiodemoapp on emulator-5554 (already installed).
Journey: open the Forms tab, type "hello" into the text input, verify the result label shows "hello".
Known accessibility ids: tabs Home | Webview | Login | Forms | Swipe | Drag; input text-input; result label input-text-result.
Phased format. Write to flows/forms-text.yaml.
```

**Stop at the plan.** The skill proposes before it writes. Check the plan against this list before you say yes:

- [ ] `appId: com.wdiodemoapp` in the header
- [ ] `setup:` launches the app and waits for something on screen (`waitUntil: "Forms"`), not a fixed `wait`
- [ ] the tab step uses the id `Forms`, not "Forms tab" or "Forms screen"
- [ ] typing is **targeted** (`type "hello" in the text-input field`), not a bare `type:` into whatever has focus
- [ ] the assertion names the result label or the expected text, not "verify it worked"
- [ ] no secrets, no `.appclaw/env/` change (nothing here is secret)

Anything missing: say so in one line and let it revise. Then approve.

Run it twice:

```bash
pnpm run claw:flow flows/forms-text.yaml              # should pass, 0 LLM calls
appclaw --flow flows/forms-text.yaml --strict         # should still pass
```

If strict mode fails where the normal run passed, one step was silently parsed by the LLM. Note which one. Ask the skill to rewrite that step in structured syntax (`tap:`, `type:`, `assert:`).

Compare with [examples/forms-text.yaml](../examples/forms-text.yaml).

> The ids `text-input` and `input-text-result` come from the demo app's source. If a step cannot find them on your build of the app, run `/appium-locators apps/demo.apk`, navigate to Forms, and use what it reports.

---

## Part B — Break it, then diagnose with `/use-appclaw-cli` (6 min)

Open `flows/forms-text.yaml` and misspell one label, for example `tap: "Formz"`. Run it:

```bash
pnpm run claw:flow flows/forms-text.yaml
```

Copy the failing step and everything AppClaw printed under it. Hand it to the operator skill:

```
/use-appclaw-cli flows/forms-text.yaml fails. Output:
<paste>
Diagnose and tell me the fix. Do not run anything in agent mode.
```

What to check in the answer:

1. Did it **read the flow file and `.env`** before answering, or guess?
2. Did it point at the misspelt label, and at the on-screen labels the error listed?
3. Did it offer to re-run `--flow` (allowed) without offering an `appclaw "goal"` run (needs your approval)?

Fix the label yourself or accept its edit. Re-run until green.

---

## Part C — Write a project skill (7 min)

Part A only worked because you typed the accessibility ids into the request. Put that knowledge where every future request finds it.

```bash
mkdir -p .claude/skills/wdio-demo-app
cp workshop/08-appclaw-skills/examples/wdio-demo-app/SKILL.md .claude/skills/wdio-demo-app/SKILL.md
```

Open it and add a Swipe section the example does not have: the screen container id is `Swipe-screen` and each carousel card has the id `card`.

Restart Claude Code (skills load at session start), then repeat Part A's request **without** the "Known accessibility ids" line:

```
/generate-appclaw-flow Forms tab, type "hello" into the text input, verify the result label shows "hello". Write to flows/forms-text-2.yaml.
```

Compare `flows/forms-text.yaml` and `flows/forms-text-2.yaml`:

| Question | Without the skill | With the skill |
|----------|-------------------|----------------|
| Did it ask you for the ids? | | |
| Did the tab step use `Forms`? | | |
| How many turns until the plan? | | |

---

## Part D — Inspect first (bonus)

```
/appium-locators apps/demo.apk
```

Navigate to the Swipe screen and take the locator map it returns. Paste the accessibility-id rows into a `/generate-appclaw-flow` request for: open Swipe, swipe left once, verify the second card is visible. Run it with `--strict`.

---

## Definition of done

- [ ] `flows/forms-text.yaml` written by the skill, passes with `pnpm run claw:flow` and with `--strict`
- [ ] You reviewed and, if needed, corrected the skill's plan before it wrote the file
- [ ] `/use-appclaw-cli` diagnosed the broken label from pasted output without running agent mode
- [ ] `.claude/skills/wdio-demo-app/SKILL.md` exists and the second generation needed no ids from you
- [ ] You can say in one sentence what a `SKILL.md` changes and what it does not (it changes how Claude Code authors; it changes nothing at run time)

---

## Hints

- Skills not in the `/` list: Claude Code was started outside the project root. `cd` to the repo and start again.
- The skill writes the file before showing a plan: it skipped its step 3. Tell it "propose first, do not write yet" and it will follow its own workflow.
- `--strict` fails on a step that looks structured: check quoting and labels. `tap: "Forms"` is fine; `tap: "Forms tab"` matches a label that does not exist.
- Assertion runs too early: the result label updates as you type, but a slow emulator can lag. Add `wait: 1` after the `type` step.
- `setup` fails at `waitUntil: "Forms"` right after `launchApp` reported ok: open `.appclaw/runs/<runId>/steps/step-001.png`. If it shows the Android launcher, the app was not in the foreground yet (a cold-start race, seen once while writing this chapter). Re-run; the second run passes.
