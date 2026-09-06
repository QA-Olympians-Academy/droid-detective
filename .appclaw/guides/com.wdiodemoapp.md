## WebdriverIO demo app (com.wdiodemoapp) — native React Native app, NOT a website
- Everything happens inside this app. Never open a browser, Chrome, Gmail or any other app.
- Values like alice@example.com are credentials to type into fields, not web addresses.
- Bottom tab bar (accessibility ids): Home | Webview | Login | Forms | Swipe | Drag.
- Each screen has a container with accessibility id <Tab>-screen (Home-screen, Login-screen, Forms-screen, Swipe-screen, Drag-screen).

## Login screen
- Open it by tapping the "Login" tab. It is open when "Login-screen" is visible.
- Fields: input-email, input-password. Submit: button-LOGIN. Tabs: button-login-container / button-sign-up-container.
- Type directly into each field by its accessibility id — no need to tap it first, and ignore keyboard suggestions.
- Valid demo credentials: alice@example.com / 10203040.
- After tapping button-LOGIN a native alert appears. Text containing "logged in" (e.g. "You are logged in!") means the login succeeded — that is the success condition. Tap its OK button to dismiss.
- Wrong credentials show an alert containing "not recognized".

## Completion rules
- "Open the Login screen" is DONE as soon as "Login-screen" is visible — do not type anything.
- "Log in … and verify I am logged in" is DONE when the "logged in" alert text is visible.
- Call done immediately when the success condition is on screen; do not keep exploring.
