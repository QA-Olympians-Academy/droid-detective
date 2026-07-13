# Exercise 7 — Read a Reasoning Trace and Identify Confidence Signals

**Time:** 20 minutes  
**Format:** individual, then group discussion

---

## Part 1 — Annotate a trace (10 min)

Below is a raw agent trace from a failing run. Read it and add `[OBS]` annotations for each step — just like the example in [examples/reasoning-trace-example.md](../examples/reasoning-trace-example.md).

**Goal:** `"Navigate to the Swipe screen and swipe the first card to the left"`

---

**Step 1**

DOM:
```xml
<ViewGroup content-desc="tab-bar">
  <ViewGroup content-desc="Home-tab" selected="true" clickable="true"/>
  <ViewGroup content-desc="Swipe-tab" clickable="true"/>
</ViewGroup>
```

Reasoning: I am on the Home screen. I need to navigate to the Swipe screen. I'll tap ~Swipe-tab.  
Action: `tap(~Swipe-tab)`  
Result: success

---

**Step 2**

DOM:
```xml
<ViewGroup content-desc="swipe-screen">
  <ViewGroup scrollable="true">
    <ViewGroup text="Card 1 of 6" content-desc="">
      <TextView text="FULLY OPEN SOURCE" />
    </ViewGroup>
  </ViewGroup>
</ViewGroup>
```

Reasoning: I am on the Swipe screen. The first card has no content-desc. I'll interact with it using its text.  
Action: `swipe(//*[@text="Card 1 of 6"], left)`  
Result: TimeoutError — element not interactable

---

**Step 3**

DOM: (same as step 2)

Reasoning: The swipe failed. The card container may not be directly scrollable. Let me try targeting the parent scroll container.  
Action: `swipe(~swipe-screen, left)`  
Result: success — DOM shows card 2 of 6

---

Your annotations for each step:

```
Step 1:
[OBS] screen_detected: ___
[OBS] confidence: ___
[OBS] selector_type: ___
[OBS] note: ___

Step 2:
[OBS] screen_detected: ___
[OBS] confidence: ___
[OBS] selector_type: ___
[OBS] note: ___

Step 3:
[OBS] screen_detected: ___
[OBS] confidence: ___
[OBS] selector_type: ___
[OBS] note: ___
```

---

## Part 2 — Score the run (5 min)

Fill in the observability summary table:

| Signal | Value | Interpretation |
|--------|-------|---------------|
| Total steps | | |
| High-confidence steps | / | |
| A11y coverage | % | |
| Flakiness risk | Which step? | |
| Root cause of Step 2 failure | | |

---

## Part 3 — Write the improvement ticket (5 min)

Based on your analysis, write a short dev ticket (3–5 sentences) that would eliminate the Step 2 failure in future runs.

The ticket must specify:
1. Which element needs a `contentDescription` attribute added
2. What value the attribute should have (proposed)
3. Which test step would benefit
4. How confidence would change after the fix

Template:
```
Title: Add contentDescription to Swipe screen card container

Problem: [what the agent observed]
Fix: [what the dev team should change in the app]
Expected outcome: [what changes in the observability trace after the fix]
Affected test: [which goal / step]
```

---

## Group discussion (if time allows)

1. At what point does low confidence become a blocker for CI rather than just a warning?
2. Who is responsible for accessibility ID coverage — QA or engineering?
3. If a step consistently takes >3s, what are the two most likely root causes?
