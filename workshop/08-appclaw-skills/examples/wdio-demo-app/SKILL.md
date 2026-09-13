---
name: wdio-demo-app
description: >
  Facts about the WebdriverIO native demo app (com.wdiodemoapp) driven in this
  workshop: screens, accessibility ids, demo credentials, success texts and
  gotchas. Load whenever writing or fixing AppClaw YAML flows, page objects,
  specs or test goals for this app.
---

# WebdriverIO native demo app — com.wdiodemoapp

A React Native app installed from `apps/demo.apk`. Everything below is an
accessibility id (`content-desc`) unless marked as text. Prefer these ids in
every step and selector; never use text XPath for the tabs. Verify any id not
listed here with `/appium-locators apps/demo.apk` before using it.

## Navigation
- Bottom tab bar ids: `Home`, `Webview`, `Login`, `Forms`, `Swipe`, `Drag`.
- Each screen has a container id `<Tab>-screen`: `Home-screen`, `Login-screen`, `Forms-screen`, `Swipe-screen`, `Drag-screen`. A screen is open when its container is visible.
- Tapping a tab is the only navigation. Never open a browser or another app.

## Login screen
- Fields: `input-email`, `input-password`. Submit: `button-LOGIN`.
- Mode tabs: `button-login-container`, `button-sign-up-container`.
- Type into each field by id ("type … in the input-email field"). A bare `type:` writes into whatever has focus, and both values end up in the email field.
- Public demo credentials: `alice@example.com` / `10203040`. They are not secrets; do not move them to `.appclaw/env/`.
- Success: a native alert whose text contains "logged in". Failure: alert text contains "not recognized". Tap OK to dismiss.

## Forms screen
- Text input `text-input`; the result label `input-text-result` echoes what was typed.
- The switch's label text toggles between "Click to turn the switch ON" and "Click to turn the switch OFF". Tap the switch by its label text, or inspect for its id.

## Conventions for flows in this repo
- Header: `appId: com.wdiodemoapp`, `platform: android`. Phased format (`setup` / `steps` / `assertions`).
- `setup` is `launchApp` followed by `waitUntil` on a tab id, never a fixed `wait`.
- Assert on visible text or an id, never on "it worked". End with `done: "<text>"`.
- Save flows under `flows/`. They run with `pnpm run claw:flow flows/<name>.yaml`, and `.github/workflows/appclaw.yml` runs them in CI on every push to `flows/**`.
