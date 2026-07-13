export default class BasePage {
    protected async swipe(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        duration = 500
    ): Promise<void> {
        await browser
            .action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ x: startX, y: startY })
            .down()
            .pause(100)
            .move({ duration, x: endX, y: endY })
            .up()
            .perform()
    }


    async waitForElement(selector: string, timeout = 10000): Promise<WebdriverIO.Element> {
        const element = await $(selector)
        await element.waitForDisplayed({ timeout })
        return element
    }

    async tap(selector: string): Promise<void> {
        const element = await this.waitForElement(selector)
        await element.click()
    }

    async typeText(selector: string, text: string): Promise<void> {
        const element = await this.waitForElement(selector)
        await element.clearValue()
        await element.setValue(text)
    }

    async getText(selector: string): Promise<string> {
        const element = await this.waitForElement(selector)
        return element.getText()
    }

    async isDisplayed(selector: string): Promise<boolean> {
        try {
            const element = await $(selector)
            return element.isDisplayed()
        } catch {
            return false
        }
    }
}
