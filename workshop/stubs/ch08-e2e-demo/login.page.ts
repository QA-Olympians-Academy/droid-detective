// @ts-nocheck
/**
 * CH8 — LOGIN PAGE OBJECT  (WORKSHOP EXERCISE STUB)
 *
 * Build the page object from locators YOU discover: run `/appium-locators`
 * against the live app (or read the Chapter 4 hierarchy dump) and copy every
 * value verbatim — remember the gotcha: the button is `~button-LOGIN`,
 * not `~LOGIN-button`.
 *
 * Reference implementation: git checkout main -- examples/ch08-e2e-demo
 */

import BasePage from '../../droid/pageobjects/base.page';

class LoginPage extends BasePage {
  // TODO(ch8): locators — one getter per element, accessibility ids first:
  //   loginTab, emailInput, passwordInput, loginButton, signUpButton,
  //   errorMessage
  get loginTab() { return $('TODO'); }
  get emailInput() { return $('TODO'); }
  get passwordInput() { return $('TODO'); }
  get loginButton() { return $('TODO'); }
  get signUpButton() { return $('TODO'); }
  get errorMessage() { return $('TODO'); }

  async navigate() {
    // TODO(ch8): tap the Login tab, then WAIT for the email input — a page
    // object method must not return before the screen is usable.
    throw new Error('TODO(ch8): implement navigate');
  }

  async login(email: string, password: string) {
    // TODO(ch8): fill both fields, tap login.
    throw new Error('TODO(ch8): implement login');
  }
}

export default new LoginPage();
