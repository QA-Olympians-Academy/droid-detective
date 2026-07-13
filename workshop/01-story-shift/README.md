# Chapter 1 — A Story About Mobility & the Shift to Agentic Testing

**Duration:** 20 minutes  
**Format:** Narrative + discussion  
**Prerequisites:** none

---

## Let me tell you a story about mobility

I have been working for years trying to automate many kinds of software products using web and mobile automation frameworks. Mobile Test Automation was by far the most challenging.

Consider a typical enterprise mobile team:
- 400 automated tests
- Weekly UI releases from a design system update
- 3 QA engineers spending 30–40% of their sprint on broken selectors

The tests were not wrong. The product was not broken. The **automation was brittle** — and the brittleness was structural, not a skill gap.

---

## The three structural problems

### 1. Static locators in a moving UI

A designer renames `~Login-button` to `~btn-login`. 47 tests break. No real regression. Just noise that erodes trust in the test suite.

### 2. Scripted steps in a reasoning problem

A test says: `tap(~checkout-confirm)`. The app says: a dialog appeared first. The test has no way to adapt — it fails with `NoSuchElementError` and produces a stack trace that tells you nothing.

### 3. Knowledge locked in people

Your senior automation engineer knows that the cart screen takes 1.2 seconds to load on Android 11 and that the splash screen appears only on first launch. When they leave, that knowledge goes with them.

---

## What changed in the last 18 months

### LLMs reason about UI structure

A model can understand that a `ViewGroup` with `contentDescription="Login"` is a tab that should be tapped to navigate to a login form — not from a lookup table, but from **contextual reasoning**. That is what makes agentic automation structurally different from scripted automation.

### MCP makes reasoning actionable

The Model Context Protocol lets a model call Appium directly: dump the DOM, tap an element, type text, assert state — all inside a reasoning loop. The model doesn't just describe what to do; it does it and observes the result.

### "AI & I" — not AI instead of I

Agentic systems are not a replacement for human judgment. They are an amplifier. The agent handles mechanical adaptation (healing selectors, navigating new flows); the engineer handles goals, strategy, and edge case judgment. The best results come from both.

---

## The shift in mental model

| Old model | New model |
|-----------|-----------|
| Write selectors manually | Agent discovers selectors from live DOM |
| Fix broken selectors manually | Agent patches selectors on failure |
| Test script = sequential steps | Test goal = intent, agent plans steps |
| CI failure requires human investigation | CI failure triggers healing loop |
| Automation knowledge locked in people | Knowledge encoded in skills and prompts |
| LLM in chat, tests in code | LLM and tests in the same loop |

---

## What this course builds

By the end you will have constructed an end-to-end agentic workflow in which an AI agent:

1. Understands **high-level test goals** (plain English)
2. **Inspects DOM hierarchy** with Appium
3. **Plans next actions** step-by-step
4. **Executes** mobile interactions
5. **Self-heals** broken tests
6. **Improves observability** through structured reasoning traces

---

## Discussion questions

Spend 5 minutes on these before moving to Chapter 2:

1. What percentage of your current CI failures are selector mismatches vs real bugs?
2. Which part of your team's automation workflow is most repetitive?
3. What "institutional knowledge" about your app lives only in people's heads right now?
4. Where would you draw the line between "let the agent decide" and "require human approval"?
