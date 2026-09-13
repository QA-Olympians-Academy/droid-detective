# Live 8 — Brief the skill before I do

**Slot:** 02:40 · Ch8 AppClaw skills (live demo) · **Time:** 3 min · **Needs:** nothing — paper only
**Format:** 90 s solo, before the demo runs → compare live

---

## Do this now

**Before I run `/generate-appclaw-flow`**, write the request you would hand it for this flow:

> Open the Forms tab, type "hello" into the text input, verify the result label shows "hello".

Three lines only:

1. **What the skill cannot know** — the facts about the app it needs from you.
2. **Done means** — the one assertion that decides pass or fail.
3. **What you expect it to ask you before writing** — one guess.

Hold on to it. We compare against what the skill actually asks and proposes.

---

## What you should get

- **Line 1 is the accessibility ids and the appId.** The skill knows AppClaw's YAML to the letter; it knows nothing about `com.wdiodemoapp`. If your line says "the Forms tab", the skill guesses a label. If it says `Forms`, `text-input`, `input-text-result`, the flow passes first time.
- **Line 2 is a visible text, not an outcome.** "The label shows hello" is checkable on screen. "The input works" is not.
- **Line 3: it asks you to approve a plan.** That is step 3 of its workflow. The room usually guesses it will ask for the platform or for credentials instead; it needs neither here.

The thing to notice as the demo runs: **the skill stops and shows a plan.** A file that drives a device with no model in the loop is not written until a human has read the steps. The same rule Chapter 9 puts on the healer's commits: reviewed before it lands.

---

## Instructor cue

- Collect two Line 1s before running. Run the skill with the weakest one first: it guesses labels, and `appclaw --flow … --strict` fails on the guessed step. Then run with a good one. The contrast is the lesson.
- Show the plan and ask the room for a yes/no before approving. Someone will spot a bare `type:`.
- Run the result with `pnpm run claw:flow` on the emulator if there is time. The zero-LLM-calls point is worth making out loud.
- If Claude Code misbehaves, open `.agents/skills/generate-appclaw-flow/SKILL.md` and read its Workflow section aloud. The skill text *is* the demo.
- **Behind schedule?** Line 1 only ("what does the skill not know?"). 60 seconds.
