## WebdriverIO demo app (com.wdiodemoapp) — native React Native app, NOT a website
- Everything happens inside this app. Never open a browser, Chrome, Gmail or any other app.
- Values like alice@example.com are credentials to type into fields, not web addresses.
- Navigate ONLY by tapping the bottom tabs, accessibility ids: Home | Webview | Login | Forms | Swipe | Drag.
  Example: find_and_click(strategy="accessibility id", selector="Login")
- Ids ending in "-screen" (Home-screen, Login-screen, Forms-screen, Swipe-screen, Drag-screen) are NOT tappable.
  They are containers that only tell you which screen is open. Never use them as a selector.

## Login screen
- Open it by tapping the tab with accessibility id "Login". It is open when "Login-screen" appears in the DOM.
- Fields: input-email, input-password. Submit button: button-LOGIN. Do NOT tap button-login-container or button-sign-up-container — they only switch between the Login and Sign up forms.
- Type directly into each field by its accessibility id — no need to tap it first, and ignore keyboard suggestions.
- Valid demo credentials: alice@example.com / 10203040.
- After tapping button-LOGIN a native alert appears. Text containing "logged in" (e.g. "You are logged in!") means the login succeeded — that is the success condition. Tap its OK button to dismiss.
- Wrong credentials show an alert containing "not recognized".

## Completion rules — call done as soon as the goal is on screen
- "Open the Login screen" / "tap the Login tab": DONE the moment "Login-screen" appears in the DOM. Call done(reason: "Login-screen is visible"). Do not type or tap anything else.
- "Open the Forms screen": DONE the moment "Forms-screen" appears. Call done(reason: "Forms-screen is visible").
- "Log in … and verify I am logged in": DONE when the "logged in" alert text is visible. Call done(reason: "alert says You are logged in!").
- Never keep exploring after the success condition is on screen.
