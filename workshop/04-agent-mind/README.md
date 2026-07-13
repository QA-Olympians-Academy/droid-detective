# Chapter 4 — The Agent's Mind: Reasoning, Planning & Context Understanding

**Duration:** 30 minutes  
**Prerequisites:** Chapter 3 complete, emulator running

---

## Learning objectives

- Understand what a "high-level test goal" is and how agents decompose it
- Interpret DOM hierarchies the way an agent does
- Trace an agent's planning process step-by-step
- Reason about errors instead of just reading stack traces
- Navigate mobile flows autonomously using context, not scripts

---

## What is a high-level test goal?

A high-level test goal is a statement of **intent**, not a list of steps.

| Low-level (scripted) | High-level (agentic) |
|---|---|
| `tap('~Login-tab'); type('~email-input', 'alice@...'); tap('~LOGIN-button')` | `"Log in with valid credentials and verify the home screen"` |
| `scroll(0, -500); tap('~product-3')` | `"Add the third product to the cart"` |
| `assert($('~cart-badge').text === '1')` | `"Verify the cart shows one item"` |

The agent converts the goal into steps. You provide the *what*; the agent decides the *how*.

---

## How agents interpret DOM hierarchies

The DOM is passed to the LLM as a raw XML string. The agent does not run XPath queries — it **reads the structure as text** and reasons about element identity.

Given this DOM excerpt:
```xml
<android.widget.FrameLayout>
  <android.widget.LinearLayout>
    <android.view.ViewGroup content-desc="Login-tab" clickable="true"/>
    <android.view.ViewGroup content-desc="Webdriver-tab" clickable="true"/>
  </android.widget.LinearLayout>
</android.widget.FrameLayout>
```

The agent reasons:
> *"There are two clickable ViewGroups with content descriptions. 'Login-tab' is the one I need to tap to reach the login form. I'll use `~Login-tab` as the selector."*

It identifies the element's **role** (navigation tab), its **purpose** (open login form), and the **best selector** — all from context, not a lookup table.

See [examples/dom-hierarchy-sample.xml](examples/dom-hierarchy-sample.xml) for a full annotated hierarchy.

---

## Planning next actions

An agent does not commit to a full plan upfront. It plans **one step at a time**, re-evaluating after each action.

```
Goal: "Log in and verify the home screen"

Step 1 (before any action):
  DOM shows: home screen, tabs visible
  Reasoning: I am not on the Login screen. I need to navigate there first.
  Action: tap(~Login-tab)

Step 2 (after tapping Login-tab):
  DOM shows: email and password inputs visible
  Reasoning: I am on the Login screen. Fill in the email first.
  Action: type(~email-input, "alice@example.com")

Step 3 (after typing email):
  DOM shows: email field populated, password field empty
  Reasoning: Email entered. Now password.
  Action: type(~password-input, "10203040")

Step 4 (after typing password):
  DOM shows: both fields populated, LOGIN button visible
  Reasoning: Credentials entered. Tap login.
  Action: tap(~LOGIN-button)

Step 5 (after tapping LOGIN):
  DOM shows: home screen with "logged in" indicator
  Reasoning: Login successful. Goal met.
  Action: write_test_result(pass, "Login verified")
```

See [examples/reasoning-trace.md](examples/reasoning-trace.md) for a full annotated trace.

---

## Error reasoning

Stack traces tell you *what* failed. Agents reason about *why*.

**Stack trace:**
```
NoSuchElementError: An element could not be located on the page using the given search parameters.
  Selector: ~email-input
```

**Agent reasoning:**
```
The selector ~email-input failed. Let me check the current DOM.
- I can see an element with content-desc="input-email"
- The prefix is the same but the order is reversed: "email-input" → "input-email"
- This is a rename, not a removal.
- Best action: retry with ~input-email
```

This is fundamentally different from what a stack trace gives you. Error reasoning produces an **actionable hypothesis**, not a crash report.

---

## Autonomous navigation

The agent navigates flows by maintaining a **mental model of where it is**:

1. Read the DOM → identify current screen
2. Determine what navigation is needed to reach the next required screen
3. Execute the navigation
4. Confirm the new screen before proceeding

This means the agent can handle:
- Unexpected dialogs (it reads the DOM, identifies the dialog, dismisses it, continues)
- Splash screens (it reads the DOM, waits or taps past it)
- Back navigation (it reasons that "go back" or the hardware Back button achieves the goal)

---

## Exercises

- [Exercise 4a — Interpret a DOM and build a test plan](exercises/exercise-4a.md)
- [Exercise 4b — Trace an agent's error reasoning](exercises/exercise-4b.md)
