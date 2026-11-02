import BasePage from '@pages/base.page'

class WebviewPage extends BasePage {
    get tab() {
        return $('~Webview')
    }

    get webView() {
        return $('//android.webkit.WebView')
    }

    async navigate(): Promise<void> {
        await this.tab.click()
    }

    async scrollDown(): Promise<void> {
        const el = await this.webView
        const { x, y } = await el.getLocation()
        const { width, height } = await el.getSize()
        await this.swipe(
            Math.round(x + width * 0.5),
            Math.round(y + height * 0.7),
            Math.round(x + width * 0.5),
            Math.round(y + height * 0.3)
        )
    }
}

export default new WebviewPage()
