/**
 * Patch validation + application — the guardrails. A patch is rejected (never
 * written) if the file or selector is missing, the new selector is malformed,
 * would no longer parse, or targets an element not in the captured DOM — so a
 * bad or hallucinated model suggestion can't corrupt a page object or apply a
 * wrong selector. In dry-run mode nothing is written; results are reported.
 */
import * as fs from 'fs';
import { DRY_RUN } from './config';
import { selectorTargetInDom } from './dom.service';
import { isSafeSelector, keepsParsing, pageObjectPath } from './page-objects.service';
import type { Patch } from './types';

export function applyPatches(
    patches: Patch[],
    failingSelectors: Set<string>,
    dom: string | null,
    detByOld: Map<string, Patch> = new Map(),
): number {
    let applied = 0;
    for (const patch of patches) {
        // Small models often emit XPath with SINGLE quotes (//*[@id='X']) — that's
        // valid XPath but would break the single-quoted `$('...')` literal. Double
        // quotes work fine inside `$('...')`, so normalize rather than reject an
        // otherwise-correct selector purely for quote style.
        let newSelector = patch.newSelector.replace(/'/g, '"');
        let reason = patch.reason;
        // Exact-name-match override: when the failing `~X` has a node named X in the
        // captured DOM (resource-id/text moved), that DOM-derived selector is ground
        // truth. A model patch pointing anywhere else is wrong even if its target
        // exists (e.g. the app's root container), and a class-qualified variant of
        // the right target can still miss at runtime — so the derived form wins.
        const det = detByOld.get(patch.oldSelector);
        if (det && det.newSelector !== newSelector) {
            console.warn(`✎ override: model proposed "${newSelector}", but the DOM has an exact name match for "${patch.oldSelector}" — using "${det.newSelector}"`);
            newSelector = det.newSelector;
            reason = det.reason;
        }
        const label = `${patch.file}: "${patch.oldSelector}" → "${newSelector}"`;
        const filePath = pageObjectPath(patch.file);

        if (!fs.existsSync(filePath)) {
            console.warn(`✗ skip (file not found): ${patch.file}`);
            continue;
        }
        // Only ever touch selectors that ACTUALLY failed — never "fix" a working one.
        if (!failingSelectors.has(patch.oldSelector)) {
            console.warn(`✗ reject (not a detected failure — refusing to modify a working selector): ${label}`);
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes(patch.oldSelector)) {
            console.warn(`✗ skip (old selector not present): ${label}`);
            continue;
        }
        if (!isSafeSelector(newSelector)) {
            console.warn(`✗ reject (malformed selector — would break the string literal): ${label}`);
            continue;
        }
        if (!selectorTargetInDom(newSelector, dom)) {
            console.warn(`✗ reject (target not in captured DOM — likely a hallucinated value): ${label}`);
            continue;
        }
        const updated = content.replaceAll(patch.oldSelector, newSelector);
        if (!keepsParsing(updated)) {
            console.warn(`✗ reject (patch breaks TypeScript compilation): ${label}`);
            continue;
        }

        if (DRY_RUN) {
            console.log(`✓ valid (dry-run, not written): ${label} — ${reason}`);
        } else {
            fs.writeFileSync(filePath, updated, 'utf8');
            console.log(`✓ patched ${label} (${reason})`);
        }
        applied++;
    }
    return applied;
}
