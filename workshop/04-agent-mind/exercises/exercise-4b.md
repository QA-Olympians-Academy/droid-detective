# Exercise 4b — Trace an Agent's Error Reasoning

**Time:** 10 minutes  
**Format:** individual

---

## Scenario

An automated test is running against a new build of the demo app. The test goal was:

> **"Log in and verify the cart badge shows 0 items"**

The agent reached Step 3 successfully (login completed, home screen visible). Then it failed:

```
Step 4
Action: tap(~cart-tab)
Result: NoSuchElementError — element not found with selector ~cart-tab
```

The agent called `get_page_source()` and received this DOM excerpt:

```xml
<android.view.ViewGroup content-desc="tab-bar">
  <android.view.ViewGroup content-desc="Home-tab" clickable="true"/>
  <android.view.ViewGroup content-desc="Webdriver-tab" clickable="true"/>
  <android.view.ViewGroup content-desc="Login-tab" clickable="true"/>
  <android.view.ViewGroup content-desc="Forms-tab" clickable="true"/>
  <android.view.ViewGroup content-desc="Checkout-tab" clickable="true"/>
</android.view.ViewGroup>
```

---

## Part 1 — Write the agent's error reasoning (5 min)

Using the format from [examples/reasoning-trace.md](../examples/reasoning-trace.md), write the reasoning block the agent should produce at this failure point.

Your reasoning must:
1. Identify whether the element exists under a different name
2. Hypothesise why the selector changed
3. Propose the correct next action
4. Explain what the agent should check before assuming the goal is still achievable

```
Step 4 (error recovery)

DOM received: [paste the relevant part]

Reasoning:
>

Action: [what should the agent do next?]
```

---

## Part 2 — Root cause classification (3 min)

The failure falls into one of these categories:

| Category | Description |
|---|---|
| A — Rename | Element exists, `content-desc` value changed |
| B — Removal | Element no longer exists in the DOM |
| C — Navigation required | Element is on a different screen, not the current one |
| D — Timing | Element exists but is not yet displayed |
| E — Structural change | Element is inside a new container or was restructured |

Which category applies here? Write a one-sentence justification.

---

## Part 3 — Self-healing patch (2 min)

Write the minimal JSON patch that would fix the failing test:

```json
{
  "file": "...",
  "oldSelector": "...",
  "newSelector": "...",
  "reason": "..."
}
```

---

## Discussion

After completing the exercise, discuss with a neighbour:

1. How would a stack trace alone (no DOM dump) have made it harder to reach the correct patch?
2. What would have happened if the agent had called `write_error` immediately instead of reasoning first?
3. What is the risk of the agent patching the selector without human review?
