/**
 * Reporting — posts the review as a PR comment (or prints it when running
 * outside Actions).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PR_NUMBER, REPO } from './config';

export function postPRComment(body: string): void {
    if (!REPO || !PR_NUMBER) {
        console.log('GITHUB_REPOSITORY or PR_NUMBER not set — printing review instead:\n', body);
        return;
    }

    // Pass args directly (no shell) and the body via a file, so quotes/backticks/
    // newlines/URLs in the model output can't break the command.
    const bodyFile = path.join(os.tmpdir(), `locator-review-${process.pid}.md`);
    fs.writeFileSync(bodyFile, `🤖 **Locator Review**\n\n${body}`);
    try {
        execFileSync('gh', ['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', bodyFile], {
            stdio: 'inherit',
        });
    } finally {
        try { fs.unlinkSync(bodyFile); } catch { /* ignore */ }
    }
}
