/**
 * Self-healing orchestrator: reads appium.log for failing selectors, gathers
 * the failure-time DOM evidence, asks a local Ollama model to suggest fixes,
 * validates + patches the page-object files, then re-runs the tests.
 * No cloud API key required.
 *
 * Flow: appium-log → dom evidence → deterministic candidates → model proposals
 *       → guarded apply (override/reject) → retry `pnpm test`.
 */
import { execSync } from 'child_process';
import { extractFailures, readLog } from './appium-log.service';
import { DRY_RUN, MODEL } from './config';
import { deterministicPatches } from './deterministic.service';
import { getFailureDoms, getLiveUiHierarchy } from './dom.service';
import { askModelToHeal } from './model.service';
import { readPageObjects } from './page-objects.service';
import { applyPatches } from './patch.service';

async function main(): Promise<void> {
    console.log('🔧 Self-healing: reading failure log…');
    const log = readLog();
    if (log === null) {
        console.log('No appium.log found — skipping self-heal');
        process.exit(0);
    }
    const failures = extractFailures(log);
    if (failures.length === 0) {
        console.log('No selector failures detected — nothing to heal');
        process.exit(0);
    }

    console.log(`Found ${failures.length} selector failure(s)`);
    const failingSelectors = new Set(failures.map(f => f.selector));
    // Prefer failure-time DOM snapshots (real failing screen); fall back to a live dump.
    const failureDoms = getFailureDoms();
    if (failureDoms) console.log('Using failure-time DOM snapshot(s) from dom-snapshots/');
    const uiHierarchy = failureDoms || getLiveUiHierarchy();
    const pageObjects = readPageObjects();

    // Ground-truth candidates derived straight from the captured DOM (exact name
    // match) — used to override a model patch that points at the wrong element,
    // and as the fallback when the model yields nothing usable.
    const detCandidates = deterministicPatches(failures, pageObjects, uiHierarchy);
    const detByOld = new Map(detCandidates.map(p => [p.oldSelector, p]));

    console.log(`Asking ${MODEL} (Ollama) for healing suggestions…`);
    const modelPatches = await askModelToHeal(failures, uiHierarchy, pageObjects);

    console.log(`\n${DRY_RUN ? '🔍 DRY RUN — validating' : 'Applying'} ${modelPatches.length} model patch(es):`);
    let applied = applyPatches(modelPatches, failingSelectors, uiHierarchy, detByOld);

    // Fallback when the model gave nothing usable (crash/OOM, or all patches
    // rejected as hallucinations): derive patches directly from the DOM.
    if (applied === 0 && detCandidates.length) {
        console.log(`\nModel healing yielded 0 valid patches — trying ${detCandidates.length} deterministic DOM-based patch(es):`);
        applied = applyPatches(detCandidates, failingSelectors, uiHierarchy, detByOld);
    }

    if (DRY_RUN) {
        console.log(`\n${applied} patch(es) are valid and would be applied.`);
        process.exit(applied > 0 ? 0 : 1);
    }

    if (applied === 0) {
        console.log('No patches applied (model and deterministic fallback both empty)');
        process.exit(1);
    }
    console.log(`Applied ${applied} patch(es)`);

    console.log('Re-running tests after healing…');
    try {
        execSync('pnpm test', { stdio: 'inherit' });
        console.log('✅ Tests passed after self-healing');
        process.exit(0);
    } catch {
        console.log('❌ Tests still failing after self-healing');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('heal-and-retry error:', err);
    process.exit(1);
});
