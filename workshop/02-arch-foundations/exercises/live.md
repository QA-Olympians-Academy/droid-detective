# Live 2 — Who detects, who decides, who executes

**Slot:** 00:15 · Ch2 Architecture (talk) · **Time:** 4 min · **Needs:** nothing — paper only
**Format:** 2 min solo → 2 min group answer

---

## Do this now

The scenario (also in the [chapter README](../README.md)):

> The agent is asked to *"log in with valid credentials and verify the home screen is visible."*
> The first `get_page_source()` returns a DOM that **does not contain the Login tab.**

Assign each job to one of the four components — **Appium · MCP · LLM Agent · Observability loop**:

| Job | Component |
|---|---|
| Detects the unexpected state | |
| Decides what to do next | |
| Executes the recovery | |
| Carries it into the next turn | |

---

## What you should get

- **Detects:** the **LLM Agent**. Nothing else in the stack knows that "the Login tab should be here." Appium returned a perfectly valid DOM — just not the expected one.
- **Decides:** the **LLM Agent** — scroll, open a menu, or re-read.
- **Executes:** **MCP** validates and routes the typed tool call → **Appium** performs it on the device.
- **Carries it forward:** the **observability loop** — the new DOM plus the action result become the next Think step.

The point to land: **only one component reasons.** Appium and MCP have no opinion about
whether a screen is the right screen. That is why a missing element is a fatal error in
classic automation and merely another observation here.

---

## Instructor cue

- Draw the four boxes as they answer; the arrows are the slide.
- The common wrong answer is "Appium detects it" — surface it, that's the whole distinction.
- **Behind schedule?** Ask only row 1, narrate the rest. 90 seconds.
