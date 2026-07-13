# Reasoning Trace Example — With Observability Annotations

This trace is from a run where the agent succeeded but showed low-confidence signals.
Annotations (marked `[OBS]`) show what an observability system would capture at each step.

**Goal:** `"Add the first product to the cart and verify the cart badge shows 1"`

---

## Step 1

**[OBS] screen_detected:** `home`  
**[OBS] elements_with_a11y_id:** 12 / 14 (86%)  
**[OBS] confidence:** HIGH

**DOM excerpt:**
```xml
<ViewGroup content-desc="Home-tab" selected="true"/>
<ViewGroup content-desc="product-list" scrollable="true">
  <ViewGroup content-desc="product-item-1">
    <TextView text="Sauce Labs Backpack" />
    <Button content-desc="add-to-cart-1" clickable="true"/>
  </ViewGroup>
```

**Reasoning:**
> I am on the Home screen. I can see a scrollable product list. The first item has an "add-to-cart-1" button with an accessibility ID. I'll tap it.

**Action:** `tap(~add-to-cart-1)`  
**[OBS] selector_type:** accessibility_id  
**[OBS] retry_count:** 0  
**[OBS] latency_ms:** 312

---

## Step 2

**[OBS] screen_detected:** `home`  
**[OBS] elements_with_a11y_id:** 12 / 14 (86%)  
**[OBS] confidence:** MEDIUM — cart badge text-only

**DOM excerpt:**
```xml
<TextView
  resource-id="com.saucelabs.mydemoapp.android:id/cart_badge"
  text="1"
  content-desc=""   <!-- ← NO accessibility ID on the badge -->
/>
```

**Reasoning:**
> The add-to-cart action succeeded. I now need to verify the cart badge shows "1". The badge element has no content-desc — I'll have to use its text or resource-id. I'll use the resource-id as it's more stable than text.

**Action:** `assert_visible(android=new UiSelector().resourceId("com.saucelabs.mydemoapp.android:id/cart_badge").text("1"))`  
**[OBS] selector_type:** resource_id_with_text  ← NOTE: fragile — "1" could be localised  
**[OBS] confidence:** MEDIUM  
**[OBS] latency_ms:** 287

---

## Step 3

**[OBS] screen_detected:** `home`  
**[OBS] confidence:** HIGH

**DOM:** badge visible, text "1"

**Reasoning:**
> Cart badge shows "1". Goal achieved.

**Action:** `write_test_result(pass, "Cart badge shows 1 after adding first product")`  
**[OBS] terminal:** true

---

## Observability summary for this run

| Signal | Value | Interpretation |
|--------|-------|---------------|
| Total steps | 3 | Efficient |
| High-confidence steps | 2/3 | Step 2 is a monitoring candidate |
| A11y coverage | 86% | 2 elements missing IDs — report to dev team |
| Flakiness risk | Step 2 | `text("1")` assertion could fail if locale changes |
| Latency | 312ms / 287ms / — | No timing issues |

---

## What this trace tells a QA engineer

1. **The cart badge has no accessibility ID.** This means Step 2 cannot use `~selector`. File a ticket: "Add contentDescription to cart badge element."

2. **The text "1" assertion is locale-sensitive.** If the app is tested in a locale that formats numbers differently, Step 2 would fail. Consider asserting presence only (`assert_visible` without text match) until the ID is added.

3. **Steps 1 and 3 are solid.** Both use accessibility IDs. No healing risk.

---

## How to read a trace in production

```
grep '"confidence":"MEDIUM"' agent-run-*.jsonl | wc -l
```

Any step that consistently shows MEDIUM or LOW confidence across multiple runs is a selector quality problem — not a test reliability problem. Fix the element's accessibility attributes in the app, not in the test.
