import { elementActionTool } from '@Ai/Bot/Agent/tools/element-action';
import { KeyboardActionTool } from '@Ai/Bot/Agent/tools/keyboard-action';
import { waitTool } from '@Ai/Bot/Agent/tools/wait';
import { writeErrorTool } from '@Ai/Bot/Agent/tools/write-error';
import { writeTestResultTool } from '@Ai/Bot/Agent/tools/write-test-result';
import { type ChatCompletionTool } from 'openai/resources';

export const TestTools: ChatCompletionTool[] = [
  elementActionTool,
  KeyboardActionTool,
  waitTool,
  writeErrorTool,
  writeTestResultTool,
];
