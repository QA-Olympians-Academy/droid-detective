/**
 * CH8 — LOGIN SPEC
 *
 * A production-quality WebdriverIO spec generated from an agent plan: one
 * describe block per screen, independent tests, explicit assertions for both
 * the happy path and the failure path.
 *
 * Run it against the emulator:
 *   pnpm test -- --spec examples/ch08-e2e-demo/login.spec.ts
 */

import { $, expect } from '@wdio/globals';

import loginPage from './login.page';

describe('Login screen', () => {
  beforeEach(async () => {
    await loginPage.navigate();
  });

  it('should display email and password fields', async () => {
    await expect(loginPage.emailInput).toBeDisplayed();
    await expect(loginPage.passwordInput).toBeDisplayed();
    await expect(loginPage.loginButton).toBeDisplayed();
  });

  it('should show error for wrong credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeDisplayed();
    await expect(loginPage.errorMessage).toHaveText('Incorrect email or password');
  });

  it('should log in with valid credentials', async () => {
    await loginPage.login('alice@example.com', '10203040');
    // After a successful login a logged-in indicator is visible
    const loggedIn = $('//*[contains(@text,"logged in")]');
    await expect(loggedIn).toBeDisplayed();
  });

  it('should navigate to Sign Up from the login screen', async () => {
    await loginPage.signUpButton.click();
    const signUpTitle = $('//*[contains(@text,"Sign Up")]');
    await expect(signUpTitle).toBeDisplayed();
  });
});
