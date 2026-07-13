# Exercise 6 — Break → Watch → Heal

**Time:** 20 minutes  
**Prerequisites:** GitHub repo with Actions enabled, `ANTHROPIC_API_KEY` secret configured

---

## Goal

Trigger the full self-healing loop by intentionally introducing a Category A failure (selector rename), watching the agent detect and heal it, then understanding why the patch worked.

---

## Part 1 — Introduce the failure (3 min)

In `droid/pageobjects/login.page.ts`, rename one selector:

```typescript
// Before — correct selector
get emailInput() { return $('~input-email') }

// After — deliberately broken
get emailInput() { return $('~input-email-BROKEN') }
```

Commit and push to a new branch:

```bash
git checkout -b exercise-6-broken-selector
git add droid/pageobjects/login.page.ts
git commit -m "exercise: intentionally broken selector"
git push origin exercise-6-broken-selector
```

---

## Part 2 — Watch the failure surface (5 min)

Open a pull request against `main`. In the Actions tab, watch the `Android Tests` workflow.

Answer:
1. Which test fails first? Which step?
2. What does the `appium.log` error message say about the selector?
3. Does the `review-locators` job comment on the PR? What does it say?

---

## Part 3 — Watch the healing loop (5 min)

After the test step fails, the `Self-heal failing tests` step runs.

Read the step log and answer:
1. What did `extractFailedSelectors()` find in the log?
2. What did the DOM dump show about the element?
3. What patch did Claude suggest?
4. Did the retry pass?

---

## Part 4 — Classify the failure (3 min)

Using the categories from the README:

| Category | Applied here? |
|---|---|
| A — Rename | |
| B — Structural change | |
| C — Flow change | |

Which category? Write a one-sentence explanation.

---

## Part 5 — Design a Category B scenario (4 min)

Think about a structural change that would be harder to heal automatically:

> The "Proceed to Checkout" button was moved inside a new `ScrollView` container.
> The button's `content-desc` did not change — it is still `~proceed-btn`.
> But the test now fails with `TimeoutError` because the button is off-screen.

1. Would `heal-and-retry.js` catch this with the current implementation? Why / why not?
2. What additional information would the healing agent need?
3. Write the one line of YAML you would add to the flow to fix this:

```yaml
# Add before the tap ~proceed-btn step:
- ???
```

---

## Definition of done

- [ ] Broken selector commit triggered a CI test failure
- [ ] `review-locators` job posted a PR comment
- [ ] Healing step either patched the selector OR `analyse-failures` created a GitHub issue
- [ ] You classified the failure type and explained the classification
- [ ] (Bonus) You described what change to `heal-and-retry.js` would handle Category B

---

## Cleanup

Restore the correct selector before merging:

```bash
git checkout droid/pageobjects/login.page.ts
git add droid/pageobjects/login.page.ts
git commit -m "exercise: restore correct selector"
git push origin exercise-6-broken-selector
```
