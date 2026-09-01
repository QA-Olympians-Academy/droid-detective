/**
 * Appium log parsing — turns a raw appium.log into the list of selectors that
 * genuinely failed during the run.
 */
import * as fs from 'fs';
import { LOG_FILE } from './config';
import type { SelectorFailure } from './types';

/** Read appium.log, or null when there is none (nothing to heal). */
export function readLog(): string | null {
    if (!fs.existsSync(LOG_FILE)) return null;
    return fs.readFileSync(LOG_FILE, 'utf8');
}

// Map a UiAutomator2 (strategy, value) pair to the WDIO selector form used in
// the page objects, so proposed patches match the source (`$('~Foo')` etc.).
function toWdioSelector(strategy: string, value: string): string {
    if (strategy === 'accessibility id') return '~' + value;
    return value; // xpath / id (resource-id) / -android uiautomator are used verbatim
}

// Parse appium.log for locators that genuinely failed. Appium logs each element
// lookup as a request line carrying the selector, then an outcome line:
//   --> POST /session/<sid>/element {"using":"accessibility id","value":"Carousel"}
//   <-- POST /session/<sid>/element 404        (200 = found, 404 = not found)
// A selector is only a real failure if it NEVER succeeded — this filters out the
// transient 404s that happen while `waitForDisplayed` polls for an element that
// then appears. Requests are paired to responses by session id (spec workers
// interleave in one log).
export function extractFailures(log: string): SelectorFailure[] {
    const reqRe = /--> POST \/session\/([^/]+)\/element\s+\{"using":"([^"]+)","value":"((?:[^"\\]|\\.)*)"\}/;
    const resRe = /<-- POST \/session\/([^/]+)\/element (\d+)/;
    const pending: Record<string, { strategy: string; value: string }> = {};
    const succeeded = new Set<string>();
    const failed = new Map<string, { strategy: string; value: string }>();

    for (const line of log.split('\n')) {
        const rq = line.match(reqRe);
        if (rq) {
            pending[rq[1]] = { strategy: rq[2], value: rq[3].replace(/\\"/g, '"') };
            continue;
        }
        const rs = line.match(resRe);
        if (rs) {
            const p = pending[rs[1]];
            if (!p) continue;
            const key = `${p.strategy}|${p.value}`;
            if (rs[2] === '200') succeeded.add(key);
            else failed.set(key, p);
            delete pending[rs[1]];
        }
    }

    return [...failed.entries()]
        .filter(([key]) => !succeeded.has(key))
        .map(([, p]) => ({
            error: `NoSuchElementError: ${toWdioSelector(p.strategy, p.value)} (${p.strategy})`,
            selector: toWdioSelector(p.strategy, p.value),
        }));
}
