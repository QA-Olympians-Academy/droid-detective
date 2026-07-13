import { type KeyboardAction } from '@Ai/Bot/Agent/tools/keyboard-action';
import { logger } from '@Ai/Bot/Utils/logger';

export const mobileKeyboardActionCall = async (
  keyboardAction: KeyboardAction,
  driver: WebdriverIO.Browser,
) => {
  const { action } = keyboardAction;

  logger.info('[ mobileKeyboardActionCall ] 📲 Performing action:', action, 'on keyboard');

  try {
    await driver.hideKeyboard(action);
    return {
      success: true,
      message: `Action ${action} performed on keyboard`,
    };
  } catch (error) {
    logger.error('Keyboard action failed:', error);
    return {
      success: false,
      message: `Failed to perform action ${action} on keyboard: ${error}`,
    };
  }
};
