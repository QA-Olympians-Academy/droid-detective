/**
 * Failure-analysis orchestrator: reads appium.log, detects locators that
 * genuinely failed, and — only when there are broken selectors — asks a local
 * Ollama model to summarise them and opens a GitHub issue.
 * No cloud API key required.
 *
 * Flow: appium-log → failed selectors → model summary (fallback body on
 *       error) → GitHub issue (or stdout locally).
 */
import { extractFailedSelectors, readLog } from './appium-log.service';
import { analyseWithModel, fallbackBody } from './model.service';
import { openGitHubIssue } from './report.service';

async function main(): Promise<void> {
    console.log('📋 Analysing test failures…');
    const fullLog = readLog();
    if (fullLog === null) {
        console.log('No appium.log found — skipping analysis');
        process.exit(0);
    }

    const selectors = extractFailedSelectors(fullLog);
    if (selectors.length === 0) {
        console.log('No broken selectors detected — not opening an issue');
        process.exit(0);
    }
    console.log(`Found ${selectors.length} broken selector(s): ${selectors.join(', ')}`);

    const logTail = fullLog.length > 15000 ? '...[truncated]\n' + fullLog.slice(-15000) : fullLog;
    let analysis: string;
    try {
        analysis = await analyseWithModel(selectors, logTail);
    } catch (err) {
        // Model unreachable/erroring — don't lose the failure record, fall back.
        console.warn(`⚠️  Model analysis failed (${(err as Error).message.split('\n')[0]}) — using a basic issue body.`);
        analysis = fallbackBody(selectors);
    }
    console.log('Analysis:\n', analysis);
    openGitHubIssue(selectors, analysis);
    console.log('Done');
}

main().catch(err => {
    // Analysis/reporting is best-effort: the real pass/fail is decided by the
    // dedicated "Fail job if tests failed" step. Never fail CI from this reporter.
    console.error('analyse-failures error (non-fatal):', err);
    process.exit(0);
});
