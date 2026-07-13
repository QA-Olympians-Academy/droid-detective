# Chapter 6 — Self-Healing Test Design

**Duration:** 30 minutes  
**Prerequisites:** Chapters 1–5 complete, GitHub Actions enabled on the repo

---

## Learning objectives

- Understand DOM drift and the selector failure lifecycle
- Identify the three categories of fixable failures
- Trace the self-healing script step-by-step
- Design adaptive navigation and intelligent recovery strategies

---

## The problem: DOM drift

A UI change lands. 47 tests break. No real regression. Just noise.

**Why does this happen?**

Static locators treat the UI as a frozen snapshot. The app is not frozen. When the DOM drifts — a `contentDescription` renamed, a button moved inside a new container, a dialog added to a flow — the selectors break.

The cost is not one broken test. It is developer trust in the entire test suite.

---

## Three categories of self-healing

### Category A — Rename

The element exists; its identifier changed.

```
Before: content-desc="email-input"   → selector: ~email-input
After:  content-desc="input-email"   → selector: ~input-email
```

**Fix:** find the element by its structural role and update the selector.

### Category B — Structural change

The element exists but is now inside a new container that must be scrolled or expanded first.

```
Before: Button directly visible on screen
After:  Button inside a new ScrollView that defaults to collapsed
```

**Fix:** add a scroll or expand action before the interaction.

### Category C — Flow change

A new screen or dialog was inserted into the user flow.

```
Before: Login → Home
After:  Login → "Allow notifications?" dialog → Home
```

**Fix:** detect the new dialog by its content and dismiss it before continuing.

---

## The healing loop

```
Test fails: selector not found
      │
      ▼
heal-and-retry.js runs
      │
      ├── Step 1: Parse appium.log → extract failing selectors
      │
      ├── Step 2: adb shell uiautomator dump → get live DOM
      │
      ├── Step 3: Send to Claude with page objects
      │           → returns JSON patch array
      │
      ├── Step 4: Apply patches to page object files
      │
      └── Step 5: pnpm test retry
                  └── pass? → ✅ CI green
                  └── fail? → ❌ open issue for human review
```

See [examples/heal-and-retry.js](examples/heal-and-retry.js) for the full annotated implementation.

---

## Adaptive navigation strategies

Beyond selector patching, agents can recover from flow changes:

| Unexpected state | Recovery strategy |
|---|---|
| Dialog appeared mid-flow | Read dialog content-desc → tap dismiss/cancel → continue |
| Splash/onboarding screen | Tap past or swipe to skip → continue |
| App in background | Bring to foreground via `activateApp()` → continue |
| Wrong screen (navigated too far) | `keyboard_action(BACK)` until correct screen → continue |
| Loading state (spinner visible) | `wait` tool → re-read DOM when spinner gone → continue |

Each of these is a standard tool call — the agent decides which to use based on what it sees in the DOM.

---

## Intelligent recovery vs blind retry

| | Blind retry | Intelligent recovery |
|---|---|---|
| Sees the new state? | No | Yes — re-reads DOM |
| Identifies root cause? | No | Yes — reasons about the change |
| Fixes the root cause? | No | Yes — patches the locator or adapts the flow |
| Useful for next run? | No | Yes — patch is committed to the page object |

---

## Limits of self-healing

Self-healing is not a substitute for good test design. It is a resilience layer. Do not heal:
- Tests that expose real functional regressions
- Tests where the business logic changed (not just the UI)
- Tests where the assertion itself is wrong

A good CI setup surfaces failures the healing script cannot fix as GitHub Issues for human review (Chapter 7).

---

## Exercise

- [Exercise 6 — Break → Watch → Heal](exercises/exercise-6.md)
