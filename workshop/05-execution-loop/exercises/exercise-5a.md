# Exercise 5a — Your First Execution Loop

**Time:** 15 minutes  
**Prerequisites:** emulator running (`adb devices` shows `emulator-5554   device`), `.env` populated

---

## Part 1 — Observe the loop (5 min)

Run the agent with a simple goal:

```bash
appclaw "Open the Login screen"
```

Watch the step log and answer before moving on:

1. How many Think → Act → Observe cycles did the agent complete?
2. What selector did it use to find the Login tab?
3. At which step did the agent confirm it had reached the goal?
4. Enable token usage (`SHOW_TOKEN_USAGE=true` in `.env`) and re-run — how many tokens per step?

---

## Part 2 — Multi-step loop (5 min)

```bash
appclaw "Log in with alice@example.com and 10203040 and verify I am logged in"
```

Observe the loop at each step:

| Step | What the agent saw | What it decided | Why |
|------|-------------------|----------------|-----|
| 1 | | | |
| 2 | | | |
| 3 | | | |

Fill in the table from the step log.

---

## Part 3 — Record a flow, run without LLM (8 min)

Start the playground:

```bash
pnpm run claw:play
```

Build this sequence step by step:

```
> tap the Login tab
> type alice@example.com in the email field
> type 10203040 in the password field
> tap the LOGIN button
> verify logged in text is visible
> /export
```

Expected: `✓ Saved to flows/login-valid.yaml`

Now run the exported flow **without the LLM**:

```bash
pnpm run claw:flow flows/login-valid.yaml
```

Confirm it passes. This is the YAML flow you would commit to CI.

---

## Part 4 — Forms flow (bonus)

Record a flow that:
1. Navigates to the Forms screen
2. Types `hello` in the text input
3. Verifies the result label shows `hello`
4. Clears the input and verifies the result clears

Export to `flows/forms-text.yaml` and run it.

---

## Definition of done

- [ ] You filled in the step table for Part 2
- [ ] `flows/login-valid.yaml` exists and passes with `pnpm run claw:flow`
- [ ] You can explain in one sentence why YAML flows cost zero LLM tokens
- [ ] (Bonus) `flows/forms-text.yaml` passes

---

## Hints

- If `SHOW_TOKEN_USAGE` shows very high numbers: `MAX_STEPS` may be too high — try 15
- The `/steps` command inside the playground shows accumulated steps before exporting
- If the agent uses text XPath instead of accessibility ID: this is logged — note which element forced the fallback
