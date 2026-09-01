/**
 * Failed-selector extraction for the analyser — reuses the healer's appium.log
 * parser (same genuinely-failed semantics: a selector counts only if it NEVER
 * resolved during the run) and reduces the result to plain selector strings.
 */
import { extractFailures, readLog } from '../heal/appium-log.service';

export { readLog };

export function extractFailedSelectors(log: string): string[] {
    return extractFailures(log)
        .map(f => f.selector)
        // Drop W3C element handles (e.g. element-6066-11e4-…) — they're runtime
        // references, not selectors.
        .filter(s => !/^~?element-[0-9a-f-]+$/i.test(s));
}
