---
name: appium-locators
description: Using the Appium MCP Server (#mcp-appium ), execute the following workflow on the Android Demo app
argument-hint: "path-to-apk"
---

Install the app from apps/android folder.

## Steps

1. **Locate the file** — if a path is given, read it directly. Otherwise search for it:
   - File: `apps/*.apk`
   - Start Appium Server
   - Start Android Device (emulator or real)

2. **App Launch**:

   - Launch Demo app from the apps folder using #mcp-appium
   - Verify successful app initialization
   - Wait for the main screen to load

### Element Identification Priority
1. **PREFERRED:** Use `resourceID` when available (e.g., `com.demobank.demoapp:id/LoginButton`)
2. **PREFERRED:** Use `accessibilityID` when available (e.g., `~login-button`)
3. **GOOD:** Use element text with XPath (e.g., `//*[contains(@text, "Submit")]`)
4. **GOOD:** Use accessibility labels with XPath (e.g., `//*[contains(@label, "Login")]`)
5. **GOOD:** Use element values with XPath (e.g., `//*[contains(@value, "Submit")]`)
6. **GOOD:** Use element class with XPath (e.g., `//*[contains(@class, "EditText")]`)
7. **LAST RESORT:** Use @name attribute or complex XPath selectors
