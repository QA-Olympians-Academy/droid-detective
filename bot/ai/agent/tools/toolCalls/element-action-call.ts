import { type ElementAction } from '@Ai/Bot/Agent/tools/element-action';
import { logger } from '@Ai/Bot/Utils/logger';
import { Key } from 'webdriverio';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const mobileElementActionCall = async (elementAction: ElementAction, driver: WebdriverIO.Browser) => {
  const { element_identifier, action, value } = elementAction;

  logger.info('[ mobileElementActionCall ] 📲 Performing action:', action, 'on element:', element_identifier);

  const findElement = async (identifier: string) => {
    logger.debug('Finding element with identifier:', identifier);
    if (identifier.includes('=')) {
      const parts = identifier.split('=');
      if (parts.length === 2) {
        const selectorType = parts[0].trim().toLowerCase();
        const selectorValue = parts[1].trim();

        if (selectorType === 'xpath') {
          logger.debug('Using XPath selector:', selectorValue);
          const element = driver.$(selectorValue);
          await element.waitForDisplayed({ timeout: 5000 });
          return element;
        } else if (selectorType === 'id') {
          const resourceId = `android=new UiSelector().resourceId("${identifier.replace(/^#/, '')}")`;
          logger.debug('Using Resource ID selector:', resourceId);
          const element = driver.$(resourceId);
          await element.waitForDisplayed({ timeout: 5000 });
          return element;
        }
      }
    } else if (identifier.includes(':id/')) {
      const resourceId = `android=new UiSelector().resourceId("${identifier.replace(/^#/, '')}")`;
      logger.debug('Using Resource ID selector:', resourceId);
      const element = driver.$(resourceId);
      await element.waitForDisplayed({ timeout: 5000 });
      return element;
    } else if (
      identifier.includes('android.') &&
      !identifier.startsWith('//') &&
      !identifier.startsWith('/')
    ) {
      const className = `android=new UiSelector().classNameMatches("${identifier.replace(/^#/, '')}")`;
      logger.debug('Using Class selector:', className);
      const element = driver.$(className);
      await element.waitForDisplayed({ timeout: 5000 });
      return element;
    } else if (identifier.startsWith('//') || identifier.startsWith('/')) {
      logger.debug('Using XPath selector:', identifier);
      const element = driver.$(identifier);
      await element.waitForDisplayed({ timeout: 5000 });
      return element;
    } else if (
      identifier.includes('XCUIElementType') &&
      !identifier.startsWith('//') &&
      !identifier.startsWith('/')
    ) {
      logger.debug('Using iOS class chain:', identifier);
      const element = driver.$(`-ios class chain:${identifier}`);
      await element.waitForDisplayed({ timeout: 5000 });
      return element;
    } else if (containsOnlyLetters(identifier)) {
      logger.debug('Using text:', identifier);
      const element = driver.$(`//*[contains(@text,'${identifier}')]`);
      await element.waitForDisplayed({ timeout: 5000 });
      return element;
    }
    logger.debug('Using accessibility ID:', identifier);
    const accessibilityId = identifier.startsWith('~') ? identifier : `~${identifier}`;
    const element = driver.$(accessibilityId);
    await element.waitForDisplayed({ timeout: 5000 });
    return element;
  };

  try {
    const element = await findElement(element_identifier);

    switch (action) {
      case 'click':
        await element.click();
        break;
      case 'set_text':
        if (!value) {
          throw new Error('Value is required for set_text action');
        }
        await element.click();
        await sleep(500); // Wait for keyboard to appear
        await element.setValue(value);
        await driver.keys(Key.Enter);
        await sleep(500); // Wait after handling keyboard
        break;
      case 'clear_text':
        await element.clearValue();
        break;
      case 'scroll_into_view': {
        const windowSize = await driver.getWindowSize();
        const centerX = windowSize.width / 2;
        const startY = windowSize.height * 0.7;
        const endY = windowSize.height * 0.3;

        await driver.swipe({
          direction: 'up',
          from: { x: centerX, y: startY },
          to: { x: centerX, y: endY },
        });
        break;
      }
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return {
      success: true,
      message: `Action ${action} performed on element ${element_identifier}`,
    };
  } catch (error) {
    logger.error('Element action failed:', error);
    return {
      success: false,
      message: `Failed to perform action ${action} on element ${element_identifier}: ${error}`,
    };
  }
};

const containsOnlyLetters = (text: string): boolean => {
  return /^[A-Za-z]+$/.test(text);
};
