/**
 * Page object access and source-level safety checks — a patch lands inside a
 * `$('<selector>')` string literal in a TypeScript file, and must not break it.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PAGE_OBJECTS_DIR } from './config';
import type { PageObjects } from './types';

// TypeScript is a dev dependency; used to validate that a patch keeps the file
// parseable. If it isn't resolvable, we fall back to the selector-shape check.
let ts: typeof import('typescript') | null;
try { ts = require('typescript'); } catch { ts = null; }

export function readPageObjects(): PageObjects {
    const files = fs.readdirSync(PAGE_OBJECTS_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    const contents: PageObjects = {};
    for (const file of files) {
        contents[file] = fs.readFileSync(path.join(PAGE_OBJECTS_DIR, file), 'utf8');
    }
    return contents;
}

export function pageObjectPath(file: string): string {
    return path.join(PAGE_OBJECTS_DIR, file);
}

// A patch is applied inside a `$('<selector>')` string literal. Reject anything
// that would break that literal (quotes, newlines, backticks) or is empty.
export function isSafeSelector(sel: unknown): sel is string {
    return typeof sel === 'string' && sel.length > 0 && !/['\n\r`]/.test(sel);
}

// Would the patched source still parse as TypeScript? transpileModule reports
// SYNTACTIC diagnostics only, so it catches a malformed selector (e.g. TS1005)
// without failing on the project's runtime-only type setup.
export function keepsParsing(source: string): boolean {
    if (!ts) return true; // can't check — rely on isSafeSelector
    const out = ts.transpileModule(source, {
        reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    });
    return !(out.diagnostics && out.diagnostics.length > 0);
}
