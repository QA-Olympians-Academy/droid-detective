# Prompt Engineering Example — Zero-Shot & Single-Shot

Shot prompting controls how much example input/output the model sees before it must produce its own output.

---

## Zero-shot

No examples provided. The model relies entirely on its training and the instructions.

**When to use:** tasks with a well-defined format the model already knows well (JSON, TypeScript, YAML). Works reliably for simple, single-purpose tasks.

### Example — zero-shot test goal

```
Navigate to the Forms screen and verify the text input label updates in real time.
```

The model knows what "navigate", "verify", and "real time" mean — no examples needed.

### Example — zero-shot YAML flow generation

```
Generate an AppClaw YAML flow that:
- Opens the demo app
- Taps the Checkout tab
- Verifies the cart total is visible

Output format: YAML following the AppClaw flow schema.
```

The model knows YAML and the AppClaw schema (from the project SKILL.md context) — no example flow needed.

---

## Single-shot (one-shot)

One example input/output pair is provided before the real request.

**When to use:**
- Output format is non-standard or project-specific
- The model must infer a convention that is not in its training data
- You need consistent structure across multiple outputs

### Example — single-shot page object generation

```
Generate a WebdriverIO page object for the screen described below.

Example:
Input: Login screen with ~email-input, ~password-input, ~LOGIN-button
Output:
  import BasePage from './base.page'
  class LoginPage extends BasePage {
    get emailInput()   { return $('~email-input') }
    get passwordInput(){ return $('~password-input') }
    get loginButton()  { return $('~LOGIN-button') }
  }
  export default new LoginPage()

Now generate for:
Input: Checkout screen with ~checkout-item-list, ~checkout-total, ~checkout-confirm-button
```

The single example anchors: getter syntax, accessibility ID format, base class, export pattern.

### Example — single-shot selector repair

```
Repair the failing selector given the current DOM.

Example:
Failing: ~sign-in-button
DOM contains: contentDescription="btn-sign-in"
Repaired: ~btn-sign-in
Reason: contentDescription attribute was renamed from "sign-in-button" to "btn-sign-in"

Now repair:
Failing: ~cart-badge
DOM contains: contentDescription="badge-cart-count", text="3"
```

---

## Few-shot (2–3 examples)

Multiple examples. Use sparingly — each example consumes context window tokens.

**When to use:** the output format is highly structured AND varies across cases (different selectors, different assertions, different error types).

### Example — few-shot healing with multiple failure types

```
Repair each failing selector. Examples:

Case 1 — rename:
Failing: ~email-input → DOM: contentDescription="input-email" → Repair: ~input-email

Case 2 — removed and replaced:
Failing: ~modal-close → DOM: no modal, back button visible → Repair: use keyboard_action BACK instead

Case 3 — inside new container:
Failing: ~submit-button → DOM: submit-button inside ViewGroup[@scrollable=true] → Repair: scroll to ~submit-button first

Now repair:
Failing: ~cart-total → DOM: [paste DOM excerpt]
```

---

## Choosing the right technique

| Task | Technique | Reason |
|------|-----------|--------|
| Simple navigation goal | Zero-shot | Model knows navigation |
| YAML flow generation | Zero-shot (with SKILL.md context) | Schema in context is enough |
| Page object generation | Single-shot | Project conventions not in training |
| Selector repair (one failure type) | Single-shot | One example anchors the pattern |
| Failure analysis (multiple failure types) | Few-shot | Each failure type needs its own example |
| Complex multi-step test plan | Chain-of-Thought | Planning required, not pattern-matching |

---

## In this project

| Location | Technique used |
|---|---|
| AppClaw plain-English prompts | Zero-shot |
| `bot/prompt-templates/SystemPrompt.hbs` | Zero-shot + domain context |
| `heal-and-retry.js` healing prompt | Chain-of-Thought |
| `.claude/generate-appclaw-flow/SKILL.md` | Single-shot (the Example section) |
| `.claude/appium-locators/SKILL.md` | Single-shot |
