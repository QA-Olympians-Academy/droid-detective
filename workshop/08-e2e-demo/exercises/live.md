# Live 8 — Write the goal before I do

**Slot:** 02:40 · Ch8 End-to-end demo (live demo) · **Time:** 3 min · **Needs:** nothing — paper only
**Format:** 90 s solo, before the demo runs → compare live

---

## Do this now

**Before I start the demo**, write what you would hand the agent for this scenario:

> A user logs in, adds the first product to the cart, and checks out.

Two lines only:

1. **The goal** — one sentence, plain English, no selectors.
2. **Done means** — the two assertions that decide pass or fail.

Hold on to it. We'll compare against what the agent actually produces.

---

## What you should get

Compare on three axes as the demo runs:

- **Did your goal say what "done" means?** Goals without a verification are the most common
  mistake — the agent will happily reach a screen and declare success.
- **Did you smuggle in steps?** "Log in, *then* tap the cart icon, *then*…" is a script
  wearing a goal's clothes. The agent plans the path; you own the outcome.
- **Are your assertions observable in the DOM?** "The order is created" is not — "the cart
  badge shows 1" is. If a human can't see it on screen, the agent can't assert it.

The generated spec is worth reading for one thing above all: **it is reviewable.** You are
not asked to trust the agent — you are asked to review its output, the same as a colleague's.

---

## Instructor cue

- Collect two goals *before* running. Read them out; pick one and actually run it if it's close — a live goal from the room beats a canned one.
- If the demo misbehaves, that is not a lost slide. Show the trace, show the confidence, and hand it to Chapter 9: this is exactly what CI captures.
- **Behind schedule?** Ask for the assertions only ("what does done mean here?"). 60 seconds.
