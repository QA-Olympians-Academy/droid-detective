import mainPage from '@pages/main.page'

describe('WDIO Demo App', () => {
    describe('Home Screen', () => {
        it('should display the home screen after launch', async () => {
            const homeScreen = await $('~Home-screen')
            await expect(homeScreen).toBeDisplayed()
        })

        it('should show all navigation tabs', async () => {
            for (const tab of ['Home', 'Webview', 'Login', 'Forms', 'Swipe', 'Drag']) {
                await expect(await $(`~${tab}`)).toBeDisplayed()
            }
        })

        it('should display the app title text', async () => {
            const title = await $('//android.widget.TextView[@text="WEBDRIVER"]')
            await expect(title).toBeDisplayed()
        })
    })

    describe('Navigation', () => {
        it('should navigate to the Login screen', async () => {
            await mainPage.loginTab.click()
            const loginScreen = await $('~Login-screen')
            await expect(loginScreen).toBeDisplayed()
        })

        it('should navigate to the Forms screen', async () => {
            await $('~Forms').click()
            const formsScreen = await $('~Forms-screen')
            await expect(formsScreen).toBeDisplayed()
        })

        it('should navigate back to the Home screen', async () => {
            await $('~Home').click()
            const homeScreen = await $('~Home-screen')
            await expect(homeScreen).toBeDisplayed()
        })
    })

    describe('Login Screen', () => {
        beforeEach(async () => {
            await mainPage.loginTab.click()
            await $('~Login-screen').waitForDisplayed()
        })

        it('should display the email and password fields', async () => {
            await expect(mainPage.usernameField).toBeDisplayed()
            await expect(mainPage.passwordField).toBeDisplayed()
        })

        it('should display the LOGIN submit button', async () => {
            await expect(mainPage.submitButton).toBeDisplayed()
        })

        it('should show Login and Sign up tabs', async () => {
            await expect(await $('~button-login-container')).toBeDisplayed()
            await expect(await $('~button-sign-up-container')).toBeDisplayed()
        })

        it('should accept input in the email field', async () => {
            await mainPage.typeText('~input-email', 'alice@example.com')
            await expect(mainPage.usernameField).toHaveValue('alice@example.com')
        })

        it('should accept input in the password field', async () => {
            await mainPage.typeText('~input-password', 'MyPassword123')
            await expect(mainPage.passwordField).toHaveValue('MyPassword123')
        })

        it('should login successfully with valid credentials', async () => {
            await mainPage.login('alice@example.com', '10203040')
            const loggedInMsg = await $('//android.widget.TextView[contains(@text,"logged in")]')
            await expect(loggedInMsg).toBeDisplayed()
        })

        it('should show an error with invalid credentials', async () => {
            await mainPage.login('wrong@example.com', 'wrongpass')
            const errorEl = await $('//android.widget.TextView[contains(@text,"not recognized")]')
            await expect(errorEl).toBeDisplayed()
        })
    })

    describe('Forms Screen', () => {
        before(async () => {
            await $('~Forms').click()
            await $('~Forms-screen').waitForDisplayed()
        })

        it('should display the text input field', async () => {
            await expect(await $('~text-input')).toBeDisplayed()
        })

        it('should update the result text as the user types', async () => {
            await mainPage.typeText('~text-input', 'hello')
            const result = await $('~input-text-result')
            await expect(result).toHaveText('hello')
        })

        it('should display the switch', async () => {
            await expect(await $('~switch')).toBeDisplayed()
        })

        it('should toggle the switch on', async () => {
            const switchEl = await $('~switch')
            const statusBefore = await $('~switch-text')
            await expect(statusBefore).toHaveText('Click to turn the switch ON')
            await switchEl.click()
            await expect(await $('~switch-text')).toHaveText('Click to turn the switch OFF')
        })

        it('should display the Active and Inactive buttons', async () => {
            await expect(await $('~button-Active')).toBeDisplayed()
            await expect(await $('~button-Inactive')).toBeDisplayed()
        })

        it('should display the dropdown', async () => {
            await expect(await $('~Dropdown')).toBeDisplayed()
        })
    })
})
