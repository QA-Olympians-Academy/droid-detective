/**
 * Deterministic healing — derive the fix straight from the captured DOM, no
 * model. Serves two roles:
 *   1. ground truth to OVERRIDE a model patch that points at the wrong element;
 *   2. fallback when the LLM produces nothing usable (server crash/OOM, or
 *      every suggestion rejected as a hallucination) — common under CI memory
 *      pressure.
 * A failing `~X` means accessibility id X wasn't found; if the DOM has a node
 * with resource-id="X" (or text="X"), the label moved there — build that
 * selector directly. It can't hallucinate (it only emits values literally
 * present in the DOM) or crash (no inference). Handles accessibility-id
 * failures (the common case); xpath failures are left to the model.
 */
import type { PageObjects, Patch, SelectorFailure } from './types';

export function deterministicPatches(
    failures: SelectorFailure[],
    pageObjects: PageObjects,
    dom: string | null,
): Patch[] {
    if (!dom) return [];
    const patches: Patch[] = [];
    for (const { selector } of failures) {
        const acc = selector.match(/^~(.+)$/);
        if (!acc) continue;
        const name = acc[1];
        let newSelector: string | null = null;
        let via: string | null = null;
        if (dom.includes(`resource-id="${name}"`)) { newSelector = `//*[@resource-id="${name}"]`; via = 'resource-id'; }
        else if (dom.includes(`text="${name}"`)) { newSelector = `//*[@text="${name}"]`; via = 'text'; }
        if (!newSelector) continue; // nothing in the DOM matches this name — can't heal it honestly
        const file = Object.keys(pageObjects).find(f => pageObjects[f].includes(selector));
        if (!file) continue;
        patches.push({
            file,
            oldSelector: selector,
            newSelector,
            reason: `deterministic: '${name}' not found as accessibility id; matched ${via}="${name}" in the DOM`,
        });
    }
    return patches;
}
