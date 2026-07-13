import BasePage from '../../../droid/pageobjects/base.page'

class LoginPage extends BasePage {
  // Navigation
  get loginTab() { return $('~Login-tab') }

  // Form inputs
  get emailInput()    { return $('~input-email') }
  get passwordInput() { return $('~input-password') }

  // Actions
  get loginButton()  { return $('~button-LOGIN') }
  get signUpButton() { return $('~sign-up-here-btn') }

  // Conditional
  get errorMessage() { return $('~sign-in-error-message') }

  async navigate() {
    await this.loginTab.click()
    await this.emailInput.waitForDisplayed({ timeout: 5000 })
  }

  async login(email: string, password: string) {
    await this.emailInput.setValue(email)
    await this.passwordInput.setValue(password)
    await this.loginButton.click()
  }
}

export default new LoginPage()
