# Game: Locator Quiz

**Teams:** 2–4 players per team  
**Time:** 8 minutes (5 min questions, 3 min answers + discussion)  
**Scoring:** 1 point per correct answer, bonus point for explaining why

---

## Rules

1. Each question shows a DOM excerpt.
2. Each team writes down the **best** selector and **why**.
3. After all questions, compare answers and score.
4. The team with the most points wins.

---

## Question 1

DOM:
```xml
<android.widget.Button
  content-desc="btn-submit"
  resource-id="com.example.app:id/submitButton"
  text="Submit"
  clickable="true"/>
```

What is the best selector for this element?

```
A) $('~btn-submit')
B) $('android=new UiSelector().resourceId("com.example.app:id/submitButton")')
C) $('//*[@text="Submit"]')
D) $('//android.widget.Button[1]')
```

<details>
<summary>Answer</summary>

**A** — `$('~btn-submit')`

Accessibility ID is always the first choice. It is human-readable, stable across recompiles, and doesn't depend on text copy.

B works but breaks if the resource ID is regenerated or the package changes.  
C breaks on any copy change or localisation.  
D breaks on any layout change.

Score: 1 point for A. Bonus point: can you explain when you'd use B instead of A?

</details>

---

## Question 2

DOM:
```xml
<android.view.ViewGroup>
  <android.widget.EditText
    content-desc=""
    resource-id="com.example.app:id/et_search"
    text="Search products"
    hint="Search products"
    focused="false"/>
</android.view.ViewGroup>
```

What is the best selector?

```
A) $('~Search products')
B) $('android=new UiSelector().resourceId("com.example.app:id/et_search")')
C) $('//*[@hint="Search products"]')
D) $('//*[@content-desc=""]')  — not selectable
```

<details>
<summary>Answer</summary>

**B** — `$('android=new UiSelector().resourceId("com.example.app:id/et_search")')`

There is no `content-desc` — A won't work. The resource ID is the next best option.

C works but hint text changes. D is invalid (empty string match selects too many elements).

Bonus: This element has no accessibility ID — flag it! File a ticket: "Add contentDescription to search input."

</details>

---

## Question 3

The agent received this error:
```
NoSuchElementError: ~login-button
```

The current DOM shows:
```xml
<android.widget.Button
  content-desc="button-login"
  text="LOG IN"
  clickable="true"/>
```

Which selector should the healed test use?

```
A) $('~login-button')         — original, broken
B) $('~button-login')         — from current DOM
C) $('//*[@text="LOG IN"]')   — text fallback
D) $('~LOG IN')               — from text
```

<details>
<summary>Answer</summary>

**B** — `$('~button-login')`

The `content-desc` was renamed from `login-button` to `button-login`. Use the actual current value.

C works today but breaks if the copy changes. D is wrong — text attributes don't map to accessibility ID selectors.

Bonus point: write the JSON heal patch.

</details>

---

## Question 4 (tiebreaker)

A developer says: "I'll just use `//*[@bounds='[540,1200][540,1400]']` — it works on my device."

What is wrong with this approach? Name two problems.

<details>
<summary>Answer</summary>

1. **Device-specific** — bounds are pixel positions, which change between screen sizes and densities.
2. **Brittle** — any layout change (adding an element above, changing margins) shifts the bounds.

Full marks: 1 point for each problem. Bonus: what would you say to this developer?

</details>

---

## Final scores

| Team | Q1 | Q2 | Q3 | Q4 | Bonus | Total |
|------|----|----|----|-----|-------|-------|
| | | | | | | |
| | | | | | | |
| | | | | | | |
