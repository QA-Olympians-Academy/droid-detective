# Live 7 — Find the step that should have paged you

**Slot:** 02:25 · Ch7 Observability (demo) · **Time:** 4 min · **Needs:** the trace on screen
**Format:** 2 min solo → 2 min group answer

---

## Do this now

Open [reasoning-trace-example.md](../examples/reasoning-trace-example.md) — a trace from a
run that **passed**.

Answer three things:

1. Which step's confidence drops?
2. What kind of selector did the agent fall back to at that step?
3. The run went green. What would you want your dashboard to do about it anyway?

---

## What you should get

1. **Step 2** — confidence goes `HIGH → MEDIUM`.
2. `resource_id_with_text` — it matched the cart badge on the text `"1"`. The trace even
   flags it: *fragile — "1" could be localised.*
3. Record it and **trend it**. One MEDIUM on a green run is noise. The same step at MEDIUM
   across ten runs is a flakiness candidate with a name, a screen and a selector attached —
   before it ever goes red.

That is the difference between a log and observability: the log says *pass*, the trace says
*passed, but it was reaching.*

---

## Instructor cue

- Ask "who would have investigated a green build?" — usually nobody. That's the point.
- Tie it back to Live 1: the person who answered **C** (knowledge in someone's head) now has
  that knowledge written down by the agent, every run.
- **Behind schedule?** Question 1 only, then narrate 2 and 3. 90 seconds.
