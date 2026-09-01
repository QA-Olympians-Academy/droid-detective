/**
 * Locator-review orchestrator: reads changed page-object files in a PR, asks
 * a local Ollama model to review the selectors for brittleness, then posts a
 * PR comment. No cloud API key required.
 *
 * Flow: git diff → changed page objects → model review → PR comment
 *       (or stdout locally).
 */
import { getChangedPageObjects, getDiff } from './git.service';
import { reviewWithModel } from './model.service';
import { postPRComment } from './report.service';

async function main(): Promise<void> {
    console.log('🔍 Reviewing changed locators in PR…');

    const files = getChangedPageObjects();
    if (files.length === 0) {
        console.log('No page-object files changed — skipping review');
        process.exit(0);
    }

    console.log('Changed files:', files);
    const diff = getDiff(files);

    if (!diff.trim()) {
        console.log('Diff is empty — skipping review');
        process.exit(0);
    }

    const review = await reviewWithModel(diff);
    console.log('Review:\n', review);
    postPRComment(review);
    console.log('Done');
}

main().catch(err => {
    console.error('review-locators error:', err);
    process.exit(1);
});
