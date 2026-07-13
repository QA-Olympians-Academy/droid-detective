# Reasoning Trace — Annotated

This is an example of the internal reasoning an agent produces during a test run.
It has been reformatted for readability; actual output appears in structured JSON alongside tool calls.

**Goal:** `"Log in with alice@example.com / 10203040 and verify the home screen"`

---

## Step 1

**DOM received:**
```
ViewGroup content-desc="tab-bar" (visible)
  └── ViewGroup content-desc="Home-tab" (selected, clickable)
  └── ViewGroup content-desc="Login-tab" (clickable)
  └── ViewGroup content-desc="Forms-tab" (clickable)
```

**Reasoning:**
> I am on the Home screen (Home-tab is selected). My goal requires logging in, so I must navigate to the Login screen first. The Login-tab element is visible and clickable. I will tap it.

**Action:** `tap(~Login-tab)`  
**Result:** Success — new DOM received

---

## Step 2

**DOM received:**
```
EditText content-desc="input-email" text="" password=false (visible)
EditText content-desc="input-password" text="" password=true (visible)
Button content-desc="button-LOGIN" text="LOGIN" clickable=true (visible)
```

**Reasoning:**
> I am now on the Login screen. Both inputs are empty. I'll type the email first, then the password. The content-desc for the email input is "input-email" — selector is `~input-email`.

**Action:** `type(~input-email, "alice@example.com")`  
**Result:** Success — DOM shows `text="alice@example.com"` in email field

---

## Step 3

**DOM received:**
```
EditText content-desc="input-email" text="alice@example.com" (filled)
EditText content-desc="input-password" text="" (empty)
Button content-desc="button-LOGIN" clickable=true
```

**Reasoning:**
> Email is filled correctly. Password field is still empty. Content-desc is "input-password". I'll type the password now.

**Action:** `type(~input-password, "10203040")`  
**Result:** Success

---

## Step 4

**DOM received:**
```
EditText content-desc="input-email" text="alice@example.com"
EditText content-desc="input-password" text="••••••••" (masked)
Button content-desc="button-LOGIN" clickable=true
```

**Reasoning:**
> Both fields are filled. The password shows as masked — expected for a password field. Login button is visible and clickable. I'll tap it.

**Action:** `tap(~button-LOGIN)`  
**Result:** Success — new DOM received after navigation

---

## Step 5

**DOM received:**
```
ViewGroup content-desc="tab-bar" (visible)
  └── ViewGroup content-desc="Home-tab" (selected)
TextView text="WEBDRIVER" (visible)
TextView text="logged in as: alice@example.com" (visible)
```

**Reasoning:**
> The Home-tab is now selected and I can see the logged-in state indicator showing the user's email. The home screen is visible and the login was successful. This satisfies the goal. I will call write_test_result with pass.

**Action:** `write_test_result(pass, "Login verified: home screen visible with alice@example.com")`

---

## What to notice

| Moment | What the agent did | Why it matters |
|--------|-------------------|----------------|
| Step 1 | Read active tab before acting | Did not assume starting state |
| Step 2 | Read `content-desc` before using as selector | Avoided `~email-input` (wrong) / used `~input-email` (correct) |
| Step 3 | Re-read DOM after each action | Confirmed state before proceeding |
| Step 5 | Verified the *goal condition*, not a hardcoded assertion | Flexible — works even if the indicator text changes slightly |

---

## Contrast: what a script does differently

```typescript
// Script — assumes state, hardcodes selectors from memory
await $('~Login-tab').click()
await $('~email-input').setValue('alice@example.com')  // ← WRONG selector
await $('~password-input').setValue('10203040')
await $('~LOGIN-button').click()                       // ← WRONG selector
await expect($('~logged-in')).toBeDisplayed()          // ← assumes this element exists
```

The script would fail at step 2 with `NoSuchElementError: ~email-input`. The agent would not — it reads the actual `content-desc` from the live DOM before constructing the selector.
