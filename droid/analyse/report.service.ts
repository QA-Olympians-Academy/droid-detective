/**
 * Reporting — opens a GitHub issue with the analysis (or prints it when
 * running outside Actions). Issue creation is best-effort by design.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { REPO } from './config';

export function openGitHubIssue(selectors: string[], body: string): void {
    if (!REPO) {
        console.log('GITHUB_REPOSITORY not set — printing issue body instead:\n', body);
        return;
    }

    const title = `[CI] Broken selectors: ${selectors.join(', ')}`.slice(0, 120);
    // Pass args directly (no shell) and the body via a file, so quotes/backticks/
    // newlines/URLs in the model output can't break the command.
    const bodyFile = path.join(os.tmpdir(), `heal-issue-${process.pid}.md`);
    fs.writeFileSync(bodyFile, body);
    try {
        execFileSync('gh', ['issue', 'create', '--repo', REPO, '--title', title, '--body-file', bodyFile], {
            stdio: 'inherit',
        });
    } catch (err) {
        // Issue creation is best-effort — never fail the workflow because we couldn't
        // open an issue (e.g. issues disabled, or a read-only token on a fork PR).
        console.warn(`⚠️  Could not open GitHub issue (${(err as Error).message.split('\n')[0]}). Analysis:\n${body}`);
    } finally {
        try { fs.unlinkSync(bodyFile); } catch { /* ignore */ }
    }
}
