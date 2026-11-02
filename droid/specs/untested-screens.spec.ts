import webviewPage from '@pages/webview.page'
import swipePage from '@pages/swipe.page'
import dragPage from '@pages/drag.page'

describe('WDIO Demo App - Additional Screens', () => {
    describe('Webview Screen', () => {
        before(async () => {
            await webviewPage.navigate()
        })

        it('should navigate to the Webview screen and render a web view', async () => {
            await expect(webviewPage.webView).toBeDisplayed()
        })

        it('should scroll down within the web view', async () => {
            await webviewPage.scrollDown()
            await expect(webviewPage.webView).toBeDisplayed()
        })
    })

    describe('Swipe Screen', () => {
        before(async () => {
            await swipePage.navigate()
        })

        it('should display the Swipe screen', async () => {
            await expect(swipePage.screen).toBeDisplayed()
        })

        it('should display the swipe carousel', async () => {
            await expect(swipePage.carousel).toBeDisplayed()
        })

        it('should advance to the next card when swiping left', async () => {
            await swipePage.swipeCarouselLeft()
            await expect(swipePage.carousel).toBeDisplayed()
        })

        it('should return to the previous card when swiping right', async () => {
            await swipePage.swipeCarouselRight()
            await expect(swipePage.carousel).toBeDisplayed()
        })
    })

    describe('Drag Screen', () => {
        before(async () => {
            await dragPage.navigate()
        })

        it('should display the Drag screen', async () => {
            await expect(dragPage.screen).toBeDisplayed()
        })

        it('should display drag items on the board', async () => {
            await expect(dragPage.dragItemLeft).toBeDisplayed()
        })

        it('should drag an item into its drop zone', async () => {
            await dragPage.dragToDropZone('~drag-l1', '~drop-l1')
            await expect(dragPage.screen).toBeDisplayed()
        })

        it('should reset the board when renew is tapped', async () => {
            await dragPage.resetBoard()
            await expect(dragPage.dragItemLeft).toBeDisplayed()
        })
    })
})
