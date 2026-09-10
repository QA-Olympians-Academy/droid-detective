# Live 9 — What does CI do here?

**Slot:** 02:55 · Ch9 CI + wrap-up (talk) · **Time:** 2 min · **Needs:** nothing — room vote
**Format:** three scenarios, hands up per option

---

> **The last block is 5 minutes for Ch9 + Ch10 + Ch11.** Run **one** of Live 9, 10 or 11 —
> not all three. This one lands best with a technical room.

## Do this now

For each scenario, call it: **(a)** heals and pushes the patch to the PR ·
**(b)** opens an issue and fails the job · **(c)** never runs at all.

1. A spec fails on your PR because a `content-desc` was renamed.
2. A spec fails because someone changed the checkout total from £10 to £12.
3. A spec fails on a PR **from a fork**.

---

## What you should get

1. **(a)** — the healer patches the selector from the live DOM, retries, and on success
   commits and pushes the patch to your PR, where it is reviewed like any other diff.
2. **(b)** — healing cannot recover a real behaviour change. `analyse-failures.js` turns
   `appium.log` into a structured issue (summary · failing tests · error detail · suggested
   fix) and **the job still fails**. Self-healing is a resilience layer, not a cover for
   regressions.
3. **(c)** for the push — fork PRs get a read-only token, so the healer cannot commit back.
   The tests still run; only the write-back is blocked.

The line to leave them with: **nothing goes green because of a heal.** If the tests failed
and healing didn't recover, the job fails.

---

## Instructor cue

- Hands up per option — the split on scenario 2 tells you whether the boundary landed.
- If the room is quiet, scenario 3 is the one that gets questions. Have the fork answer ready.
- **Behind schedule?** Scenario 2 alone, asked rhetorically. 30 seconds.
