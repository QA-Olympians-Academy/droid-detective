import { type ChatCompletionTool } from 'openai/resources';

export const KeyboardActionTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'keyboard_action',
    description: 'Hide a keyboard.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The strategy to hide the keyboard',
          enum: ['default', 'done'],
        },
      },
    },
  },
};

export type KeyboardAction = {
  keyboard_strategy: string;
  action: 'default' | 'done';
  value?: string;
};
