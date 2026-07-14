import BasePage from '@pages/base.page'

class SwipePage extends BasePage {
    get tab() {
        return $('~Swipe')
    }

    get screen() {
        return $('~Swipe-screen')
    }

    get carousel() {
        return $('//*[@resource-id="Carousel"]')
    }

    async navigate(): Promise<void> {
        await this.tab.click()
        await this.screen.waitForDisplayed()
    }

    async swipeCarouselLeft(): Promise<void> {
        const el = await this.carousel
        const { x, y } = await el.getLocation()
        const { width, height } = await el.getSize()
        await this.swipe(
            Math.round(x + width * 0.8),
            Math.round(y + height * 0.5),
            Math.round(x + width * 0.2),
            Math.round(y + height * 0.5)
        )
    }

    async swipeCarouselRight(): Promise<void> {
        const el = await this.carousel
        const { x, y } = await el.getLocation()
        const { width, height } = await el.getSize()
        await this.swipe(
            Math.round(x + width * 0.2),
            Math.round(y + height * 0.5),
            Math.round(x + width * 0.8),
            Math.round(y + height * 0.5)
        )
    }
}

export default new SwipePage()
