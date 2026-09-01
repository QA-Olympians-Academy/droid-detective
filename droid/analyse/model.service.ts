/**
 * Model analysis — asks the local Ollama model to summarise the broken
 * selectors into a GitHub issue body. No cloud API key required.
 */
import OpenAI from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, MODEL } from './config';

const client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY });

export async function analyseWithModel(selectors: string[], log: string): Promise<string> {
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: 'user',
                content: `You are a mobile test automation engineer. A CI run failed because these
locators could not be found on screen:

${selectors.map(s => `- ${s}`).join('\n')}

Relevant Appium log tail:
\`\`\`
${log}
\`\`\`

Provide a concise GitHub issue body (markdown) that includes:
1. **Summary** — one sentence: which selectors broke and the likely cause (renamed / removed / screen changed)
2. **Broken selectors** — the bullet list above
3. **Suggested fix** — how to recrawl the screen and update the page objects

Focus only on the broken selectors. Use clear headings. Keep it under 300 words.`,
            },
        ],
    });

    return response.choices[0]?.message?.content || 'No analysis available';
}

// Static issue body used when the model is unreachable (e.g. Ollama died/OOM'd
// on the runner by the time this reporting step runs). Analysis is best-effort —
// a model hiccup must never fail the CI job or lose the failure record.
export function fallbackBody(selectors: string[]): string {
    return `## Summary
A CI run failed because the selector(s) below could not be found on screen (renamed, removed, or the screen changed). Automated model analysis was unavailable for this run.

## Broken selectors
${selectors.map(s => `- \`${s}\``).join('\n')}

## Suggested fix
Re-crawl the failing screen (inspect the UI hierarchy / DOM snapshot in the run artifacts) and update the matching page-object selectors to the current attributes.`;
}
