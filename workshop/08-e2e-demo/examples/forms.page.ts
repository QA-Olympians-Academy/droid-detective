import BasePage from '../../../droid/pageobjects/base.page'

class FormsPage extends BasePage {
  // Navigation
  get formsTab() { return $('~Forms-tab') }

  // Text input section
  get textInput()       { return $('~text-input') }
  get textInputResult() { return $('~input-text-result') }

  // Switch section
  get switch1()       { return $('~switch1') }
  get switchLabel()   { return $('~switch-text') }

  // Dropdown section
  get dropdownInput()  { return $('~Dropdown-input-1') }
  get dropdownOption() { return $('~Dropdown-option-1') }

  async navigate() {
    await this.formsTab.click()
    await this.textInput.waitForDisplayed({ timeout: 5000 })
  }

  async typeAndVerify(text: string) {
    await this.textInput.setValue(text)
    await this.textInputResult.waitForDisplayed()
  }

  async clearInput() {
    await this.textInput.clearValue()
  }

  async toggleSwitch() {
    await this.switch1.click()
  }
}

export default new FormsPage()
