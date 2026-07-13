# Exercise 8 — Full Narrative Goal to Running Spec

**Time:** 30 minutes  
**Prerequisites:** emulator running, Claude Code open in the project

---

## The narrative goal

You have been handed this requirement from a product manager:

> **"A user can drag item L1 to drop zone DL1. After dragging, the item should be locked in the drop zone. The user can reset the board and all items return to their original positions."**

This is Chapter 8's full demo: you will go from this plain-English narrative to a passing WebdriverIO spec using the Inspect → Plan → Execute → Observe cycle.

---

## Part A — Inspect (7 min)

With the emulator running, inspect the Drag screen:

```
Using mcp-appium, navigate to the Drag screen and return
every element with its accessibility ID and element role.
```

Or:
```
/appium-locators apps/demo.apk
```

Before moving to Part B, answer:
1. What is the accessibility ID of the first draggable item?
2. What is the accessibility ID of the first drop zone?
3. Is there a reset button? What is its locator?
4. Which elements have no accessibility ID? (mark ⚠️)
5. What gesture does the DOM suggest is needed to initiate a drag?

---

## Part B — Plan (8 min)

Give Claude the locator map and the narrative goal:

```
Based on the locators from the Drag screen, write a step plan for the narrative goal:
"A user can drag L1 to DL1, L1 is locked in, and reset returns it."

Account for:
- The long-press required to initiate drag on Android (600ms minimum)
- How to derive coordinates from element size/position
- What "locked in" looks like as a DOM assertion
- What "returned to original position" looks like after reset
```

Review the plan. Check:
- [ ] Long-press pause ≥ 600ms
- [ ] Coordinates from `getLocation()` + `getSize()`, not hardcoded pixels
- [ ] Assertion after drag (not just after reset)
- [ ] Reset verification

---

## Part C — Execute (15 min)

```
Implement the plan as a WebdriverIO spec:
- Create droid/pageobjects/drag.page.ts
- Create droid/specs/drag.spec.ts
```

Requirements:
- [ ] `drag.page.ts` extends `BasePage`
- [ ] `dragToDropZone(sourceSelector, dropSelector)` method using coordinates from `getLocation()` + `getSize()`
- [ ] Long-press pause ≥ 600ms inside `dragToDropZone`
- [ ] `drag.spec.ts` imports `dragPage` from `@pages/drag.page`
- [ ] All interactions through the page object — no `$('...')` in the spec body

Run it:
```bash
pnpm test --spec droid/specs/drag.spec.ts
```

Common failures:

| Symptom | Cause | Fix |
|---------|-------|-----|
| Drag does not start | Long-press too short | Increase `.pause()` to 800ms |
| Drag overshoots | Hardcoded coordinates | Use `getLocation()` + `getSize()` |
| Drop zone unchanged | Wrong drop zone selector | Re-inspect with MCP |
| Reset does not work | Wrong selector or not clicked | Check `resetButton` getter |

---

## Part D — Observe (bonus)

After the spec passes:

1. Re-read the agent's reasoning trace from the planning step.
   - Did the agent get the long-press requirement right without being told?
   - Did it identify the correct assertion for "locked in"?

2. Check the confidence signals:
   - Were any selectors flagged as fragile (no accessibility ID)?
   - Which step had the lowest confidence?

3. Write one paragraph describing what a non-agentic approach (scripted) would have required to build the same spec, and how long it would have taken.

---

## Definition of done

- [ ] `droid/pageobjects/drag.page.ts` created, extends `BasePage`
- [ ] `droid/specs/drag.spec.ts` passes with at least 2 `it` blocks
- [ ] No hardcoded pixel coordinates in the page object
- [ ] No `$('...')` calls directly in the spec
- [ ] You can describe the 5-step workflow (Goal → Inspect → Plan → Execute → Observe) from memory
