import BasePage from '@pages/base.page'

class MainPage extends BasePage {
    get loginTab() {
        return $('~Login')
    }

    get loginFormTab() {
        return $('~button-login-container')
    }

    get usernameField() {
        return $('~input-email')
    }

    get passwordField() {
        return $('~input-password')
    }

    get submitButton() {
        return $('~button-LOGIN')
    }

    async login(username: string, password: string): Promise<void> {
        await this.loginTab.click()
        await this.typeText('~input-email', username)
        await this.typeText('~input-password', password)
        await this.submitButton.click()
    }
}

export default new MainPage()
