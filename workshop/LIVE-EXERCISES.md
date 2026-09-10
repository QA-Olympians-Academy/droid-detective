# Live exercises — one per chapter (3-hour agenda)

Short, in-session activities: **2–5 minutes each**, designed to be run from the front without
extending the run-of-show. They do not replace the longer labs in each chapter's
`exercises/` folder — those stay as the deep work and the take-home.

**These do not add time to the agenda.** In talk blocks they convert 3–5 minutes of
presenting into room activity. In hands-on blocks they *are* the first thing the room does.
The one place you must choose is the final block: five minutes covers Ch9, Ch10 **and** Ch11,
so run **one** of Live 9 / 10 / 11.

---

## Run sheet

| Slot | Ch | Live exercise | Time | Needs | Room does |
|------|----|---------------|------|-------|-----------|
| 00:00 | 1 | [Name your own three](01-story-shift/exercises/live.md) | 3 min | paper | classify their last broken test |
| 00:15 | 2 | [Who detects, who decides, who executes](02-arch-foundations/exercises/live.md) | 4 min | paper | assign four jobs to four components |
| 00:30 | 3 | [The 60-second green check](03-setup/exercises/live.md) | 5 min | laptop + emulator | run the four verify commands |
| 00:55 | 4 | [Steps in, goal out](04-agent-mind/exercises/live.md) | 4 min | DOM on screen | collapse a script into a goal; pick a selector |
| 01:15 | 5 | [Predict the loop, then run it](05-execution-loop/exercises/live.md) | 5 min | laptop + emulator | predict turns, run one agentic goal |
| 01:55 | 6 | [Heal it offline, then break the healer](06-self-healing/exercises/live.md) | 5 min | **laptop only** | run the offline healer, read the diff |
| 02:25 | 7 | [Find the step that should have paged you](07-observability/exercises/live.md) | 4 min | trace on screen | spot the confidence drop in a green run |
| 02:40 | 8 | [Write the goal before I do](08-e2e-demo/exercises/live.md) | 3 min | paper | write the goal + assertions before the demo |
| 02:55 | 9 | [What does CI do here?](09-ci-github/exercises/live.md) | 2 min | room vote | three failure scenarios → heal / issue / blocked |
| 02:55 | 10 | [Pick one, name the barrier](10-future-outlook/exercises/live.md) | 3 min | paper | choose a direction, name the trust barrier |
| 02:55 | 11 | [Three lines before you leave](11-qa-games/exercises/live.md) | 2 min | paper | try / question / surprise |

**Pick one for the last block:** Live 9 for a technical room · Live 10 for a senior or mixed
room · Live 11 if you are out of time or the room is tired.

---

## What each one needs

- **Paper only** — 1, 2, 8, 10, 11. These work with a dead laptop, a projector failure, or a
  room that never got set up.
- **Laptop, no emulator or model** — 6. The offline healer runs against a canned failure, so
  a student whose emulator is broken can still take part in the self-healing block.
- **Laptop + emulator** — 3 and 5. These are the two that depend on a green machine, which is
  exactly what Live 3 gates.
- **Screen only (instructor drives)** — 4 and 7. Run them from the front if machines are slow.

---

## If you are behind schedule

Every exercise has a **Behind schedule?** line at the bottom with a cut-down version —
usually the first question asked to the room instead of solo work. Cutting all of them back
recovers about 12 minutes across the session.

Order to sacrifice, if it comes to it: **2, then 7, then 4.** Keep 3 (it is the gate for the
hands-on blocks), keep 5 and 6 (they are the blocks), and always keep one closer from
9 / 10 / 11 — a workshop that ends on a slide ends badly.

---

## The deeper labs

Unchanged, and still the better material when you have the time — a full-day format, an
internal repeat, or homework:

| Ch | Lab | Time |
|----|-----|------|
| 4 | [4a — Interpret a DOM and build a test plan](04-agent-mind/exercises/exercise-4a.md) · [4b](04-agent-mind/exercises/exercise-4b.md) | 15 min |
| 5 | [5a](05-execution-loop/exercises/exercise-5a.md) · [5b — Run the Bot](05-execution-loop/exercises/exercise-5b.md) (needs LambdaTest) | 15 min |
| 6 | [6 — Break → watch → heal](06-self-healing/exercises/exercise-6.md) | 20 min |
| 7 | [7 — Read a reasoning trace](07-observability/exercises/exercise-7.md) | 20 min |
| 8 | [8 — Narrative goal to running spec](08-e2e-demo/exercises/exercise-8.md) | 20 min |
| 9 | [9a](09-ci-github/exercises/exercise-9a.md) · [9b](09-ci-github/exercises/exercise-9b.md) | 15 min |
| 11 | [Locator Quiz](11-qa-games/games/locator-quiz.md) · [Fix the Broken Test](11-qa-games/games/fix-the-test.md) · [Selector Bingo](11-qa-games/games/selector-bingo.md) | 8–10 min each |

Chapters 1, 2, 3 and 10 have no long-form lab — the live exercise is the whole activity.
Every chapter also has a `quiz.json` for the LMS.
