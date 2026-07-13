import { expect, $ } from '@wdio/globals'
import loginPage from './login.page'
import { describe, beforeEach, it } from 'node:test'

describe('Login screen', () => {
  beforeEach(async () => {
    await loginPage.navigate()
  })

  it('should display email and password fields', async () => {
    await expect(loginPage.emailInput).toBeDisplayed()
    await expect(loginPage.passwordInput).toBeDisplayed()
    await expect(loginPage.loginButton).toBeDisplayed()
  })

  it('should show error for wrong credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword')
    await expect(loginPage.errorMessage).toBeDisplayed()
    await expect(loginPage.errorMessage).toHaveText('Incorrect email or password')
  })

  it('should log in with valid credentials', async () => {
    await loginPage.login('alice@example.com', '10203040')
    // After successful login the Login tab is no longer highlighted
    // and a logged-in indicator is visible
    const loggedIn = await $('//*[contains(@text,"logged in")]')
    await expect(loggedIn).toBeDisplayed()
  })

  it('should navigate to Sign Up from the login screen', async () => {
    await loginPage.signUpButton.click()
    const signUpTitle = await $('//*[contains(@text,"Sign Up")]')
    await expect(signUpTitle).toBeDisplayed()
  })
})
