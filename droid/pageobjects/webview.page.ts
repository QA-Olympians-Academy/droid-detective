import BasePage from '@pages/base.page'

class WebviewPage extends BasePage {
    get tab() {
        return $('~Webview')
    }

    get webView() {
        return $('//android.webkit.WebView')
    }

    // The web page keeps animating, so UiAutomator2 never sees the app go idle
    // and waits its full waitForIdleTimeout (10 s default) before every command:
    // 10–20 s per call on a software-rendered CI emulator, enough to time out the
    // scroll test and the next screen's hook. Skip the idle wait on this screen.
    async navigate(): Promise<void> {
        await browser.updateSettings({ waitForIdleTimeout: 0 })
        await this.tab.click()
    }

    async leave(): Promise<void> {
        await $('~Home').click()
        await browser.updateSettings({ waitForIdleTimeout: 10000 })
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
