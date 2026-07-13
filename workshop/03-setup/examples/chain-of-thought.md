# Prompt Engineering Example — Chain-of-Thought (CoT)

Chain-of-Thought prompting asks the model to reason step-by-step before acting.  
It improves accuracy on tasks that require planning, multi-hop reasoning, or error recovery.

---

## When to use it in this course

| Scenario | Why CoT helps |
|----------|--------------|
| Complex test goals ("Log in, add to cart, verify total") | Forces the agent to plan before acting |
| Self-healing prompts | Agent must reason about *why* a selector changed |
| DOM interpretation | Agent must infer element role from context, not just attribute values |
| Failure analysis | Agent must connect log lines to root causes |

---

## Basic structure

```
[Context about the current state]

Think through this step by step before deciding on an action:
1. What is the current screen?
2. What is needed to reach the goal?
3. What obstacles might appear?
4. What is the single best next action?

Then take that action.
```

The key phrase is **"think through this step by step"** — it signals the model to produce reasoning tokens before committing to a tool call.

---

## Example 1 — Test goal with CoT baked in

**Without CoT:**
```
Log in with alice@example.com and 10203040.
```

**With CoT:**
```
Goal: Log in with alice@example.com and 10203040.

Before acting, reason through:
- What screen are you currently on?
- What navigation is required to reach the login form?
- What is the correct order to fill in the fields?
- How will you verify successful login?

Then execute the plan.
```

Result: the agent does not blindly tap `~LOGIN-button` — it first checks whether the Login tab is visible and navigates if needed.

---

## Example 2 — Self-healing prompt with CoT

This is the pattern used in `heal-and-retry.js`:

```
The following test failed with NoSuchElementError on selector "~email-input":

[stack trace]

Current UI hierarchy:
[XML dump]

Think through this step by step:
1. Is the element present in the hierarchy under a different name?
2. Is the element present but inside a container that wasn't visible before?
3. Has the contentDescription attribute been changed? What to?
4. What is the minimal patch that would fix the failing test?

Return a JSON patch object: { file, oldSelector, newSelector, reason }
```

CoT forces the agent to work through each hypothesis before committing to a patch — reducing hallucinated selectors.

---

## Example 3 — Planning a drag-and-drop test

```
I need to write a test for the Drag screen. The screen has draggable items
(drag-l1 through drag-l4) and drop zones (drop-l1 through drop-l4).

Think through the test step by step:
1. What gesture does Android require to initiate a drag?
2. How should coordinates be computed to avoid hardcoded pixels?
3. What is the minimum set of assertions that verifies a successful drop?
4. What does "reset" look like — what should the assertions check after reset?

Then write the WebdriverIO test plan.
```

---

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| "Think about X" without specifying what to think | Model produces shallow reasoning | List the specific questions to answer |
| CoT on simple, single-step tasks | Adds latency and tokens with no benefit | Use CoT only for multi-step or uncertain tasks |
| Burying the goal after the reasoning instructions | Model focuses on the process, forgets the goal | State the goal first, then ask for step-by-step reasoning |

---

## Rule of thumb

Use Chain-of-Thought when:
- The task has more than 2 sequential decisions
- The outcome depends on a condition you cannot know in advance (current screen state, element availability)
- You need the model to explain its reasoning for debugging or trust-building
