# Game: Selector Bingo

**Players:** full group (facilitator reads, everyone plays)  
**Time:** 8 minutes  
**How to win:** mark 5 in a row — shout "BINGO!" and explain each one to score

---

## How to play

1. Print or open the bingo card below
2. The facilitator reads a selector aloud
3. Mark it if it appears on your card AND you know why it's an anti-pattern (or a best practice)
4. First to get 5 in a row shouts "BINGO!" and must explain each marked item

---

## Bingo Card

```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│   ~submit-button     │  //LinearLayout[2]   │  ~email-input        │  //*[@text="Login"]  │ resourceId("id/btn") │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│  //*[@index="3"]     │  ~LOGIN-button       │  bounds=[540,200]    │  ~cart-badge         │  //*[@class=         │
│                      │                      │                      │                      │  "android.widget.    │
│                      │                      │                      │                      │  Button"]            │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│  android=new         │  ~input-email        │    FREE              │  //*[@text=          │  ~proceed-to-        │
│  UiSelector()        │                      │   SQUARE             │   "NEXT"]            │  checkout            │
│  .text("Submit")     │                      │                      │                      │                      │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│  //View[1]/View[3]   │  ~Forms-tab          │  content-desc=""     │  ~sign-in-error-     │  resourceId(         │
│                      │                      │  (empty string)      │  message             │  "id/btn_abc12f9")   │
├──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│  //*[@password=      │  ~Checkout-tab       │  //*[@bounds=        │  ~swipe-screen       │  android=new         │
│   "true"]            │                      │   "[0,0][1080,2400]"]│                      │  UiSelector()        │
│                      │                      │                      │                      │  .index(0)           │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

---

## Answer key

| Selector | Status | Why |
|---|---|---|
| `~submit-button` | ✅ Good | Accessibility ID — first choice |
| `//LinearLayout[2]` | ❌ Bad | Structural XPath — breaks on any layout change |
| `~email-input` | ⚠️ Check | Valid format, but verify it matches the actual `content-desc` (demo app uses `input-email`) |
| `//*[@text="Login"]` | ❌ Bad | Text XPath — breaks on any copy change or localisation |
| `resourceId("id/btn")` | ❌ Bad | Truncated resource ID — non-functional |
| `//*[@index="3"]` | ❌ Bad | Index-based — breaks when element order changes |
| `~LOGIN-button` | ⚠️ Check | Valid format, but demo app uses `~button-LOGIN` — always verify against the actual DOM |
| `bounds=[540,200]` | ❌ Bad | Device-specific pixel coordinates |
| `~cart-badge` | ✅ Good | Accessibility ID |
| `//*[@class="android.widget.Button"]` | ❌ Bad | Class-based — matches ALL buttons |
| `android=new UiSelector().text("Submit")` | ⚠️ Risky | Text-based, fragile — only use when no accessibility ID exists |
| `~input-email` | ✅ Good | Correct accessibility ID for demo app email field |
| `FREE SQUARE` | ✅ | Always marked |
| `//*[@text="NEXT"]` | ❌ Bad | Text XPath |
| `~proceed-to-checkout` | ⚠️ Check | Valid format, but demo app renamed to `~checkout-proceed-btn` in recent build |
| `//View[1]/View[3]` | ❌ Bad | Structural XPath |
| `~Forms-tab` | ✅ Good | Correct accessibility ID for the Forms tab |
| `content-desc=""` (empty) | ❌ Bad | No accessibility attribute — should file a ticket |
| `~sign-in-error-message` | ✅ Good | Correct accessibility ID for the error label |
| `resourceId("id/btn_abc12f9")` | ❌ Bad | Looks like a generated/hashed ID — will change on recompile |
| `//*[@password="true"]` | ❌ Bad | Attribute-based — matches ALL password fields |
| `~Checkout-tab` | ✅ Good | Correct accessibility ID |
| `//*[@bounds="[0,0][1080,2400]"]` | ❌ Bad | Full-screen bounds — matches the root container |
| `~swipe-screen` | ✅ Good | Accessibility ID for the Swipe screen container |
| `android=new UiSelector().index(0)` | ❌ Bad | Index-based — breaks when order changes |

---

## Debrief

After the game, discuss:
1. How many of the "bad" selectors have you seen in a real codebase?
2. Which anti-pattern is the hardest to catch in code review?
3. Which tool in this course would have caught the most of these before they reached CI?
