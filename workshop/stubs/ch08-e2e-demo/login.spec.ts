// @ts-nocheck
/**
 * CH8 — LOGIN SPEC  (WORKSHOP EXERCISE STUB)
 *
 * Write the production-quality spec for your page object. Rules:
 *   - each `it` must be runnable alone (beforeEach re-navigates),
 *   - the failure path is a first-class test,
 *   - the page object owns locators, the spec owns intent.
 *
 * Run: pnpm test -- --spec examples/ch08-e2e-demo/login.spec.ts
 * Reference implementation: git checkout main -- examples/ch08-e2e-demo
 */

import { $, expect } from '@wdio/globals';

import loginPage from './login.page';

describe('Login screen', () => {
  beforeEach(async () => {
    await loginPage.navigate();
  });

  it('should display email and password fields', async () => {
    // TODO(ch8): assert the three form elements are displayed.
  });

  it('should show error for wrong credentials', async () => {
    // TODO(ch8): login with wrong credentials; assert the error message text
    // is 'Incorrect email or password'.
  });

  it('should log in with valid credentials', async () => {
    // TODO(ch8): login with alice@example.com / 10203040; assert a logged-in
    // indicator is visible.
  });

  it('should navigate to Sign Up from the login screen', async () => {
    // TODO(ch8): tap the sign-up link; assert the Sign Up screen title.
  });
});
