/**
 * Git access — which page-object files changed in the PR, and their diff.
 * BASE_SHA/HEAD_SHA come from the workflow (the PR's merge-base and head).
 */
import { execSync } from 'child_process';
import { BASE_SHA, HEAD_SHA } from './config';

export function getChangedPageObjects(): string[] {
    const output = execSync(
        `git diff --name-only ${BASE_SHA} ${HEAD_SHA} -- 'droid/pageobjects/**'`,
        { encoding: 'utf8' },
    ).trim();

    if (!output) return [];
    return output.split('\n').filter(Boolean);
}

export function getDiff(files: string[]): string {
    if (files.length === 0) return '';
    return execSync(
        `git diff ${BASE_SHA} ${HEAD_SHA} -- ${files.map(f => `'${f}'`).join(' ')}`,
        { encoding: 'utf8' },
    );
}
