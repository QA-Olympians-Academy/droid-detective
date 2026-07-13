# Exercise 4a — Interpret a DOM and Build a Test Plan

**Time:** 15 minutes  
**Format:** individual or pairs

---

## Part 1 — Read the DOM (5 min)

Open [examples/dom-hierarchy-sample.xml](../examples/dom-hierarchy-sample.xml).

Answer these questions **before** writing any selectors:

1. Which elements are currently **visible** on screen?
2. Which elements are hidden or disabled?
3. What screen is the app currently showing?
4. List every `content-desc` value you can find. Which ones are useful as selectors?
5. Are there any elements where the `content-desc` value might surprise someone who hasn't read the XML? (e.g., different from what you'd guess by looking at the UI)

---

## Part 2 — Build a test plan (10 min)

You have been given this test goal:

> **"Log in with valid credentials, then verify the error message is NOT visible."**

Write a numbered step plan that an agent could follow. For each step include:
- What the agent should observe first
- What action it should take
- What it should verify before moving to the next step

**Template:**

```
Step 1:
  Observe: [what to check in the DOM]
  Action:  [what tool call to make]
  Verify:  [what confirms the step succeeded]

Step 2:
  ...
```

---

## Part 3 — Identify the traps

Look at your plan and answer:

1. Which selector in your plan is the most likely to break after a UI update? Why?
2. At which step could an unexpected dialog or animation cause the plan to fail?
3. What would a well-written agent do differently from a brittle script at that step?

---

## Reference: selector priority order

| Priority | Strategy | Selector format |
|----------|----------|----------------|
| ✅ 1st | Accessibility ID (`content-desc`) | `~value` |
| ✅ 2nd | Resource ID | `android=new UiSelector().resourceId("pkg:id/name")` |
| ⚠️ 3rd | Text | `//*[@text="LOGIN"]` |
| ❌ Last | Structural XPath | `//LinearLayout[2]/Button` |

---

## Definition of done

- [ ] You identified all visible elements in the sample DOM
- [ ] Your test plan has at least 4 steps with observe/action/verify
- [ ] You used `~content-desc` selectors (not text or XPath)
- [ ] You identified at least one trap in your plan and described how an agent handles it
