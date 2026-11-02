# Live 5 — Predict the loop, then run it

**Slot:** 01:15 · Ch5 The execution loop (hands-on) · **Time:** 5 min · **Needs:** laptop, emulator booted
**Format:** predict on paper → watch the agent on screen → run the flow yourself → compare

---

## Do this now

**First, predict (45 s).** The instructor is about to run this goal on the projector:

```bash
appclaw "Open the Login screen"
```

Before it runs, write down:

1. How many **turns** (Think → Act → Observe) will this take?
2. What will the **first tool call** be?
3. What **ends** the run — and how would *you* know it really succeeded?

**Watch the instructor's run** — the step log *and* the emulator.

**Then run the deterministic version yourself:**

```bash
pnpm run claw:flow flows/login.yaml
```

Count its steps. Find the last line.

---

## What you should get

- **Turns:** a goal this small should be one tap plus a verification. Almost everyone over-estimates.
- **First tool call:** a tap on the `Login` tab, selected from the DOM — *not* the goal text.
- **What ends it:** the agent calling `done`. The other exit is the step budget — `MAX_STEPS` in
  `.env` (30), and `MAX_STEPS = 15` in [examples/ch05-execution-loop/loop.ts](../../../examples/ch05-execution-loop/loop.ts),
  commented "a lost agent must not loop forever."
- **How you'd know:** not from the ✓. On the workshop's local llama3.1 the goal run can print
  `✓ PASSED` without tapping anything — the model writes its tool call as text and the
  unverified `done` counts. You know from the emulator, or from an assertion that checks the
  screen. Your flow run has one: `assert "logged in"` — `✓ All steps passed`, 10/10, no LLM.

The thing to notice: **the agent has to read the screen before it acts**, and **its own
"passed" is a claim, not evidence.** The flow is what you put in CI.

---

## Instructor cue

- Ask for turn-count predictions out loud before you run it — the over-estimate is the teaching moment.
- Keep the emulator visible next to the log. If the run says PASSED while the emulator never left
  Home, stop and point at it — that is the lesson, not a failure of the demo.
- Everyone's own flow run is checkpoint 2 — hands up at `✓ All steps passed`.
- **Behind schedule?** Skip the goal run; everyone runs the flow. 2 minutes.
