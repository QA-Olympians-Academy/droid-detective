# Chapter 8 — Full End-to-End Demo: From High-Level Goal to Autonomous Test Execution

**Duration:** 45 minutes  
**Prerequisites:** Chapters 1–7 complete, emulator running

---

## Learning objectives

- Provide a narrative test goal and watch the full loop execute
- Understand the Inspect → Plan → Execute workflow in one connected session
- Review agent reasoning logs while watching execution
- Produce a production-quality WebdriverIO spec from an agent-generated plan

---

## The full workflow

```
  1. PROVIDE GOAL (plain English narrative)
  ──────────────────────────────────────────────
  "Log in, add item to cart, validate total"
         │
         ▼
  2. INSPECT (live DOM via Appium MCP)
  ──────────────────────────────────────────────
  /appium-locators apps/demo.apk
  → Returns ranked locator map for every screen element
         │
         ▼
  3. PLAN (agent + Claude Code)
  ──────────────────────────────────────────────
  Given locators + goal → numbered step plan
  Accounts for: navigation, timing, assertions, edge cases
         │
         ▼
  4. EXECUTE (WebdriverIO + POM)
  ──────────────────────────────────────────────
  /generate-wdio-spec → TypeScript spec
  pnpm test → CI-ready output
         │
         ▼
  5. OBSERVE (reasoning trace + result)
  ──────────────────────────────────────────────
  Read the trace. Did the agent reason correctly?
  Are there confidence signals to act on?
```

---

## Step 1 — Provide the goal

Start with a **narrative goal** — the kind a product manager or BA would write:

```
"A user logs in with valid credentials, adds the first product in the catalog
to their cart, navigates to the cart, and verifies the cart total matches
the product price."
```

This is the input to the entire workflow. Nothing else is specified upfront.

---

## Step 2 — Inspect with Appium MCP

With the emulator running, ask Claude Code to inspect the relevant screens:

```
/appium-locators apps/demo.apk
```

Or use the MCP server directly:

```
> Using mcp-appium, navigate to the Home screen, then the Cart screen,
  and return a ranked locator map for every interactive element.
```

Review the output. Ask yourself:
- Which elements have no accessibility ID? (flag with ⚠️)
- Which locators look auto-generated or fragile?

---

## Step 3 — Plan

Give Claude the locator map and the goal:

```
Based on the locators, write a step plan for the narrative goal above.

Account for:
- How to navigate from Home to the product list
- How to add to cart (specific button, not generic)
- How to navigate to the cart
- What "total matches price" means as a concrete assertion
```

Review the plan before proceeding. A good plan should have:
- [ ] Navigation steps for each screen transition
- [ ] Timing notes (wait for element, not fixed pauses)
- [ ] Specific assertions (not "verify cart is visible" — "verify ~cart-total equals ~product-1-price")
- [ ] At least one edge case considered

---

## Step 4 — Execute

```
Implement the plan as a WebdriverIO spec following the POM pattern in this project.
```

Expected output:
- `droid/pageobjects/cart.page.ts` — new page object
- `droid/specs/cart.spec.ts` — spec with at least 3 `it` blocks

Run it:

```bash
pnpm test --spec droid/specs/cart.spec.ts
```

See `examples/login.page.ts` and `examples/login.spec.ts` for the page object and spec patterns used in this project.

---

## Step 5 — Observe and reflect

After the run, review the agent's reasoning trace (from the step log or the debug output).

Answer:
1. Was the agent's plan accurate, or did it discover something unexpected at runtime?
2. Were any selectors replaced by the agent (healing) during execution?
3. Which assertions were the most specific — and which were most fragile?

---

## The BasePage pattern (reference)

```typescript
export default class BasePage {
  protected async swipe(startX, startY, endX, endY, duration = 500) {
    await browser
      .action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: startX, y: startY }).down().pause(100)
      .move({ duration, x: endX, y: endY }).up().perform()
  }

  async waitForElement(selector: string, timeout = 10000) {
    const el = await $(selector)
    await el.waitForDisplayed({ timeout })
    return el
  }
}
```

Always use TypeScript getters — never cache element references:

```typescript
// ✅ Fresh reference on every access
get loginButton() { return $('~button-LOGIN') }

// ❌ Cached — StaleElementReferenceException
private loginButton = $('~button-LOGIN')
```

---

## Exercise

- [Exercise 8 — Full narrative goal to running spec](exercises/exercise-8.md)
