import BasePage from '@pages/base.page'

class DragPage extends BasePage {
    get tab() {
        return $('~Drag')
    }

    get screen() {
        return $('~Drag-drop-screen')
    }

    get dragItemLeft() {
        return $('~drag-l1')
    }

    get dragItemCenter() {
        return $('~drag-c1')
    }

    get dragItemRight() {
        return $('~drag-r1')
    }

    get dropZoneLeft() {
        return $('~drop-l1')
    }

    get renewButton() {
        return $('~renew')
    }

    async navigate(): Promise<void> {
        await this.tab.click()
        await this.screen.waitForDisplayed()
    }

    async dragToDropZone(sourceSelector: string, dropSelector: string): Promise<void> {
        const source = await $(sourceSelector)
        const target = await $(dropSelector)
        const srcLoc = await source.getLocation()
        const srcSize = await source.getSize()
        const tgtLoc = await target.getLocation()
        const tgtSize = await target.getSize()

        await browser
            .action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ x: Math.round(srcLoc.x + srcSize.width / 2), y: Math.round(srcLoc.y + srcSize.height / 2) })
            .down()
            .pause(600)
            .move({ duration: 1000, x: Math.round(tgtLoc.x + tgtSize.width / 2), y: Math.round(tgtLoc.y + tgtSize.height / 2) })
            .up()
            .perform()
    }

    async resetBoard(): Promise<void> {
        await this.renewButton.click()
    }
}

export default new DragPage()
