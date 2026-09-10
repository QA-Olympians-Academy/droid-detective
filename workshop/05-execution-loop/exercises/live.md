# Live 5 — Predict the loop, then run it

**Slot:** 01:15 · Ch5 The execution loop (hands-on) · **Time:** 5 min · **Needs:** laptop, emulator booted
**Format:** predict on paper → hands on keyboard → compare

---

## Do this now

**First, predict (45 s).** Before you run anything, write down:

1. How many **turns** (Think → Act → Observe) will this take?
2. What will the **first tool call** be?
3. What **ends** the run?

**Then run it:**

```bash
appclaw "Open the Login screen"
```

Watch the step log. Count the turns. Find the last line.

---

## What you should get

- **Turns:** usually 2–3. Almost everyone over-estimates — a goal this small is one tap plus a verification.
- **First tool call:** an `element_action` with `click` on the login tab, selected from the DOM — *not* the goal text.
- **What ends it:** the agent calling `write_test_result`. That is the only clean exit. The other two are `write_error`, and the step budget — `MAX_STEPS = 15` in
  [examples/ch05-execution-loop/loop.ts](../../../examples/ch05-execution-loop/loop.ts), commented "a lost agent must not loop forever."

The thing to notice in your own log: **the agent read the screen before it acted.** It did
not know the selector until it had the DOM. Nobody wrote one down.

---

## Instructor cue

- Ask for turn-count predictions out loud before anyone runs it — the over-estimate is the teaching moment.
- Have one person read their step log to the room; the wording differs on every machine because the model is non-deterministic. Say so.
- Slow machines: this is a good moment to point at the local model doing the work, not a cloud.
- **Behind schedule?** Predict and run, skip the comparison discussion. 2 minutes.
