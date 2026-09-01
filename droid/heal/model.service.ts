/**
 * Model service — asks the local Ollama model for selector fixes and parses
 * its output into Patch objects. No cloud API key required.
 */
import OpenAI from 'openai';
import { LLM_API_KEY, LLM_BASE_URL, MODEL } from './config';
import type { PageObjects, Patch, SelectorFailure } from './types';

const client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY });

const HEAL_SYSTEM_PROMPT = `You are an expert mobile test automation engineer. You repair broken WebdriverIO + Appium (Android/UiAutomator2) selectors by reading the live UI hierarchy and returning corrected selectors.

The UI hierarchy is Android XML. Each node may carry:
- content-desc="X"  → the element's ACCESSIBILITY ID; the WDIO selector is \`~X\`
- resource-id="X"   → the WDIO selector is \`//*[@resource-id="X"]\`
- text="X"          → the WDIO selector is \`//*[@text="X"]\`

A failing selector \`~X\` means "accessibility id X" (content-desc="X"). To fix it, find the element the test intended in the hierarchy and choose a new selector using this PRIORITY:
  1. a node with content-desc="Y"      → \`~Y\`
  2. else a node with resource-id="Y"  → \`//*[@resource-id="Y"]\`
  3. else a node with text="Y"         → \`//*[@text="Y"]\`
  4. else a minimal class-based XPath.

CRITICAL: if the failing \`~X\` has NO matching content-desc in the hierarchy but a node has resource-id="X" (or a clearly corresponding id), the label moved from content-desc to resource-id — use \`//*[@resource-id="X"]\`. NEVER invent a content-desc that is not present in the hierarchy.

COPY ATTRIBUTE VALUES VERBATIM from the hierarchy. Do NOT add a package prefix (e.g. do NOT turn resource-id="Carousel" into "com.app:id/carousel"), and do NOT change the case. Use the exact string that appears in the XML. If the value you would use does not appear literally in the hierarchy, you are guessing — don't.

Selector STRING rules (the value goes inside \`$('...')\`, a single-quoted JS string):
- NEVER use a single quote (') in the selector. In XPath, wrap values in DOUBLE quotes: \`//*[@resource-id="Carousel"]\`.
- One line only: no newlines, backticks, or leading/trailing spaces.

Worked example — failing \`~Carousel\`; the hierarchy contains \`<android.view.ViewGroup resource-id="Carousel" ...>\` and no content-desc="Carousel":
  correct → newSelector = \`//*[@resource-id="Carousel"]\`   (WRONG: \`//*[@content-desc='Carousel']\`)

OUTPUT FORMAT — return ONLY a JSON object (no prose, no markdown, no code fences), shaped EXACTLY:
{"patches":[{"file":"<page object filename, e.g. swipe.page.ts>","oldSelector":"<the failing selector, copied verbatim, e.g. ~Carousel>","newSelector":"<the corrected selector, e.g. //*[@resource-id=\\"Carousel\\"]>","reason":"<short reason>"}]}
One object in the array per failing selector. All JSON strings use double quotes; a double quote INSIDE a selector value (XPath) must be escaped as \\". Emit nothing before or after the JSON object.`;

// A STRICT JSON schema constrains the model's output SHAPE, not just "valid
// JSON". With plain json_object, llama3.1 on CI returned valid-but-wrong JSON
// ({"selector":"~Drag","old":{"elements":[…]}}) that carried no patch — json
// mode forces syntax, not structure. json_schema forces both, so every response
// is a {"patches":[…]} object the parser can read.
const PATCH_SCHEMA = {
    type: 'object',
    properties: {
        patches: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    file: { type: 'string' },
                    oldSelector: { type: 'string' },
                    newSelector: { type: 'string' },
                    reason: { type: 'string' },
                },
                required: ['file', 'oldSelector', 'newSelector', 'reason'],
                additionalProperties: false,
            },
        },
    },
    required: ['patches'],
    additionalProperties: false,
} as const;

export async function askModelToHeal(
    failures: SelectorFailure[],
    uiHierarchy: string | null,
    pageObjects: PageObjects,
): Promise<Patch[]> {
    const pageObjectsText = Object.entries(pageObjects)
        .map(([name, content]) => `### ${name}\n\`\`\`typescript\n${content}\n\`\`\``)
        .join('\n\n');

    const hierarchySection = uiHierarchy
        ? `\n\n## Current UI Hierarchy (ADB dump)\n\`\`\`xml\n${uiHierarchy.slice(0, 18000)}\n\`\`\``
        : '';

    const prompt = `Fix these failing selectors from a WebdriverIO + Appium test run.

## Failing selectors / errors
${failures.map(f => `- ${f.error}\n  ${f.selector}`).join('\n')}
${hierarchySection}

## Page Object files
${pageObjectsText}

Output one FILE/OLD/NEW/REASON block per failing selector, in the format described.`;

    // Small local models are non-deterministic about output format — retry a few
    // times until we get a parseable patch (parsePatches accepts blocks OR JSON).
    const MAX_ATTEMPTS = 5;
    let lastText = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model: MODEL,
                // Reliability + speed on a small CPU-bound model:
                //   - temperature 0 first try (deterministic); a small bump on retries.
                //   - response_format json_schema: Ollama constrains decoding to the exact
                //     PATCH_SCHEMA shape, so the model can't emit prose OR wrong-keyed JSON.
                //   - max_tokens: the patch JSON is tiny; capping output stops the model
                //     rambling for minutes on CPU (each token is a slow CPU step in CI).
                temperature: attempt === 1 ? 0 : 0.3,
                max_tokens: 800,
                response_format: {
                    type: 'json_schema',
                    json_schema: { name: 'selector_patches', strict: true, schema: PATCH_SCHEMA },
                },
                messages: [
                    { role: 'system', content: HEAL_SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
            });
            lastText = response.choices[0]?.message?.content || '';
            const patches = parsePatches(lastText);
            if (patches.length > 0) return patches;
            console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS}: no parseable patch in model output${attempt < MAX_ATTEMPTS ? ' — retrying' : ''}`);
        } catch (err) {
            // The model server can die mid-request under CI memory pressure (e.g.
            // "llama-server process has terminated: segmentation fault"). Don't abort
            // the whole run — Ollama respawns the server, so back off briefly and retry.
            console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS}: model call failed (${(err as Error).message.split('\n')[0]})${attempt < MAX_ATTEMPTS ? ' — retrying' : ''}`);
            if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 5000));
        }
    }
    console.warn('Model never returned a parseable patch. Last raw output:\n----\n' + lastText.slice(0, 500) + '\n----');
    return [];
}

// Parse the model's patches. With the forced response_format the model returns
// a {"patches":[...]} object (or a bare array) — that's the primary path. A
// plaintext FILE/OLD/NEW/REASON block parser is kept as a fallback for runs
// against models/endpoints that don't honor the JSON format constraint.
export function parsePatches(text: string): Patch[] {
    const norm = (arr: unknown): Patch[] => (Array.isArray(arr) ? arr : [])
        .filter(p => p && p.file && p.oldSelector && p.newSelector)
        .map(p => ({ file: p.file, oldSelector: p.oldSelector, newSelector: p.newSelector, reason: p.reason || 'healed' }));

    // 1) Preferred (matches the forced response_format): a JSON object
    //    {"patches":[...]}, or a bare array. Try the whole string first — that
    //    handles brackets inside a reason string — then a substring fallback for
    //    any stray text a run wraps around the JSON.
    for (const candidate of [text, (text.match(/[[{][\s\S]*[\]}]/) || [])[0]]) {
        if (!candidate) continue;
        try {
            const parsed = JSON.parse(candidate.replace(/,(\s*[\]}])/g, '$1'));
            const arr = Array.isArray(parsed) ? parsed : parsed.patches;
            const out = norm(arr);
            if (out.length) return out;
        } catch { /* not JSON on this candidate — try the next */ }
    }

    // 2) Fallback: plaintext FILE/OLD/NEW/REASON blocks. Leading markdown
    //    (**, -, >, #) and a trailing "**" after the label are tolerated.
    const strip = (s: string) => s.replace(/^[\s>*`'"-]+/, '').replace(/[\s*`'"]+$/, '').trim();
    const patches: Patch[] = [];
    for (const block of text.split(/^\s*-{3,}\s*$/m)) {
        const grab = (label: string) => {
            const m = block.match(new RegExp(`^[\\s>*\`#-]*${label}:\\**\\s*(.+)$`, 'mi'));
            return m ? strip(m[1]) : '';
        };
        const file = grab('FILE');
        const oldSelector = grab('OLD');
        const newSelector = grab('NEW');
        const reason = grab('REASON') || 'healed';
        if (file && oldSelector && newSelector) patches.push({ file, oldSelector, newSelector, reason });
    }
    return patches;
}
