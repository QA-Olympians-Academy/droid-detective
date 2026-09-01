/**
 * DOM evidence — the captured UI hierarchy the healer reasons and validates
 * against, plus the guard that checks a selector's target actually exists.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { DOM_SNAPSHOT_DIR } from './config';

// Preferred source: DOM snapshots captured by wdio.conf.ts `afterTest` AT THE
// MOMENT each test failed — so they contain the actual failing screen (unlike a
// post-hoc adb dump, which only sees whatever screen the app ended on).
export function getFailureDoms(): string | null {
    if (!fs.existsSync(DOM_SNAPSHOT_DIR)) return null;
    const files = fs.readdirSync(DOM_SNAPSHOT_DIR).filter(f => f.endsWith('.xml'));
    if (files.length === 0) return null;
    // Full content (not truncated) — the DOM-existence guard must see every
    // element, and the target may sit deep in the tree. The prompt is truncated
    // separately in the model service to bound the model's context.
    return files
        .map(f => `### Failing screen: ${f}\n${fs.readFileSync(path.join(DOM_SNAPSHOT_DIR, f), 'utf8')}`)
        .join('\n\n');
}

// Fallback: dump the CURRENT screen via ADB (only useful if the app is still on
// the failing screen — e.g. a single-screen run).
export function getLiveUiHierarchy(): string | null {
    try {
        execSync('adb shell uiautomator dump /sdcard/window_dump.xml', { stdio: 'pipe' });
        return execSync('adb pull /sdcard/window_dump.xml /tmp/window_dump.xml && cat /tmp/window_dump.xml', {
            stdio: 'pipe',
        }).toString();
    } catch (err) {
        console.warn('Could not fetch UI hierarchy via ADB:', (err as Error).message);
        return null;
    }
}

// Reject selectors whose target isn't actually present in the captured DOM —
// this catches HALLUCINATED values (e.g. a made-up package-qualified resource-id
// like com.app:id/carousel when the real one is just "Carousel").
export function selectorTargetInDom(selector: string, dom: string | null): boolean {
    if (!dom) return true; // no DOM to check against — the other guards still apply
    const acc = selector.match(/^~(.+)$/);
    if (acc) return dom.includes(`content-desc="${acc[1]}"`);
    const attrs = [...selector.matchAll(/@([\w-]+)\s*(?:=|,)\s*["']([^"']+)["']/g)];
    if (!attrs.length) return true; // class-only xpath / unrecognized form — can't verify, allow
    // Class-qualified xpath (//android.widget.Foo[@a="b"]): in UiAutomator XML the
    // node tag IS the class, so the attributes must co-occur on a tag of that
    // class — a right-value/wrong-class selector finds nothing at runtime.
    const cls = selector.match(/^\/\/([A-Za-z][\w.]*)\[/);
    if (cls && cls[1] !== '*') {
        const tagRe = new RegExp(`<${cls[1].replace(/\./g, '\\.')}\\b[^>]*>`, 'g');
        for (const tag of dom.match(tagRe) || []) {
            if (attrs.every(([, attr, val]) => tag.includes(`${attr}="${val}"`))) return true;
        }
        return false;
    }
    return attrs.every(([, attr, val]) => dom.includes(`${attr}="${val}"`));
}
