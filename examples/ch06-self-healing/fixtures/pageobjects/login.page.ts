// Fixture page object — the selectors the healer will patch.
// `~Login-tab` and `~button-LOGIN` no longer exist in fixtures/failing-screen.xml.

class LoginPage {
  get loginTab() { return $('~Login-tab') }
  get emailInput() { return $('~input-email') }
  get passwordInput() { return $('~input-password') }
  get loginButton() { return $('~button-LOGIN') }
}

export default new LoginPage()
