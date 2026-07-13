# Game: Fix the Broken Test

**Players:** individual  
**Time:** 10 minutes  
**Scoring:** fastest correct fix wins; tie-break on explanation quality

---

## Setup

You are a self-healing agent. You have been given a failing test and the current DOM.  
Your job: write the JSON heal patch that would fix the test.

---

## Scenario 1 — Category A: Rename

**Failing test:**
```typescript
// droid/pageobjects/checkout.page.ts
get proceedButton() { return $('~proceed-to-checkout') }
```

**Error:** `NoSuchElementError: ~proceed-to-checkout`

**Current DOM excerpt:**
```xml
<android.widget.Button
  content-desc="checkout-proceed-btn"
  text="PROCEED"
  clickable="true"/>
```

**Write the patch:**
```json
{
  "file": "___",
  "oldSelector": "___",
  "newSelector": "___",
  "reason": "___"
}
```

<details>
<summary>Answer</summary>

```json
{
  "file": "checkout.page.ts",
  "oldSelector": "~proceed-to-checkout",
  "newSelector": "~checkout-proceed-btn",
  "reason": "content-desc renamed from 'proceed-to-checkout' to 'checkout-proceed-btn'"
}
```

</details>

---

## Scenario 2 — Category B: New container

**Failing test:**
```typescript
// droid/pageobjects/menu.page.ts
get settingsItem() { return $('~menu-settings') }
```

**Error:** `TimeoutError: ~menu-settings not displayed after 8000ms`

**Current DOM excerpt:**
```xml
<android.widget.DrawerLayout content-desc="navigation-drawer" clickable="true">
  <!-- drawer is CLOSED by default — must tap to open -->
  <android.view.ViewGroup content-desc="menu-settings" clickable="true"/>
</android.widget.DrawerLayout>
```

**What is the correct fix?** (This is not a pure selector patch — think about what the page object `navigate()` method needs.)

<details>
<summary>Answer</summary>

The element exists but is inside a closed drawer. The page object needs a two-step interaction:

1. Open the drawer: `tap(~navigation-drawer)`
2. Then tap: `tap(~menu-settings)`

The heal patch is not enough — the `navigate()` or `openSettings()` method in the page object needs to open the drawer first.

```json
{
  "file": "menu.page.ts",
  "oldSelector": "~menu-settings",
  "newSelector": "~menu-settings",
  "reason": "selector unchanged — element is now inside a drawer that must be opened first; add tap(~navigation-drawer) before accessing menu items"
}
```

</details>

---

## Scenario 3 — Category C: New flow step

**Failing test:**
```typescript
it('should log in and see home screen', async () => {
  await loginPage.login('alice@example.com', '10203040')
  await expect(homePage.title).toBeDisplayed()  // FAILS
})
```

**Error:** `TimeoutError: ~home-title not displayed`

**Current DOM after login (instead of home screen):**
```xml
<android.widget.FrameLayout content-desc="permission-dialog">
  <android.widget.TextView text="Allow notifications?" />
  <android.widget.Button content-desc="allow-notifications-btn" text="Allow"/>
  <android.widget.Button content-desc="deny-notifications-btn" text="Don't Allow"/>
</android.widget.FrameLayout>
```

**Write the fix.** (Hint: the page object's `login()` method needs updating, not just a selector.)

<details>
<summary>Answer</summary>

A new notifications permission dialog was added after login. The `login()` method must handle it:

```typescript
async login(email: string, password: string) {
  await this.emailInput.setValue(email)
  await this.passwordInput.setValue(password)
  await this.loginButton.click()
  // Handle optional notifications dialog
  try {
    const denyBtn = await $('~deny-notifications-btn')
    await denyBtn.waitForDisplayed({ timeout: 3000 })
    await denyBtn.click()
  } catch {
    // Dialog did not appear — continue
  }
}
```

JSON patch is not sufficient here — this is a flow change requiring code logic, not just a selector replacement.

</details>

---

## Scoring

| Scenario | Points |
|----------|--------|
| Scenario 1 correct patch | 2 |
| Scenario 2 identifies root cause | 3 (not a selector fix) |
| Scenario 3 identifies root cause | 3 (not a selector fix) |
| **Total** | **8** |

Bonus: for each scenario, identify which category (A / B / C) from the Chapter 6 framework applies.
