/**
 * Model review — asks the local Ollama model to review changed selectors for
 * brittleness. No cloud API key required.
 */
import OpenAI from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, MODEL } from './config';

const client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY });

export async function reviewWithModel(diff: string): Promise<string> {
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'user',
                content: `You are reviewing changes to WebdriverIO page-object files for an Android app tested with Appium + UIAutomator2.

Here is the diff:
\`\`\`diff
${diff.slice(0, 10000)}
\`\`\`

Review the changed selectors and provide feedback on:
1. **Brittle selectors** — index-based XPaths, generated IDs, position-dependent selectors
2. **Best practice issues** — prefer accessibility IDs (~) or resource-IDs over XPath where possible
3. **Suggestions** — specific improvements for any brittle selectors found

Format as a GitHub PR comment (markdown). Be concise. If all selectors look good, say so briefly.`,
            },
        ],
    });

    return response.choices[0]?.message?.content || 'No review available';
}
