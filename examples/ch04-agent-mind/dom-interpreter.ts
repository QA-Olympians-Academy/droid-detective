/**
 * CH4 — DOM INTERPRETER
 *
 * The agent does not run XPath queries against the app. It receives the raw
 * UI hierarchy XML (from `adb shell uiautomator dump` / Appium's getPageSource)
 * and reads it as text, reasoning about which elements are interactable and
 * which locator strategy is the most stable for each one.
 *
 * This module makes that reading process explicit and deterministic so you
 * can study it: parse the hierarchy → extract the interactable elements →
 * rank locator candidates per element using the same priority order the
 * agent's system prompt teaches the LLM (Chapter 4 README, "locator hierarchy"):
 *
 *   1. accessibility id  (content-desc)   → `~value`
 *   2. resource-id                        → `//*[@resource-id="value"]`
 *   3. text                              → `//*[@text="value"]`   (fragile — copy changes)
 *   4. class-based XPath                 → last resort
 *
 * Run it: `pnpm exec ts-node examples/ch04-agent-mind/run.ts`
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UiElement {
  className: string;      // e.g. android.widget.Button
  contentDesc?: string;   // → accessibility id selector (~value)
  resourceId?: string;    // → resource-id XPath
  text?: string;          // → text XPath (fragile)
  clickable: boolean;
  scrollable: boolean;
  password: boolean;
  bounds?: string;        // "[x1,y1][x2,y2]" — position only, never a locator
}

export type LocatorStrategy = 'accessibility-id' | 'resource-id' | 'text-xpath' | 'class-xpath';

export interface LocatorCandidate {
  strategy: LocatorStrategy;
  selector: string;
  score: number;          // 0–100, higher = more stable
  reason: string;         // why the agent would (or would not) pick this
}

export interface LocatorMapEntry {
  element: UiElement;
  best: LocatorCandidate;
  alternatives: LocatorCandidate[];
}

// ── Step 1: parse the hierarchy XML into elements ─────────────────────────────

/**
 * A minimal, dependency-free parser: it walks the XML tags with a regex and
 * pulls out the attributes the agent cares about. Good enough for uiautomator
 * dumps, which are flat, well-formed, attribute-only XML.
 */
export function parseHierarchy(xml: string): UiElement[] {
  const withoutComments = xml.replace(/<!--[\s\S]*?-->/g, '');
  const tagRe = /<([\w.$]+)((?:\s+[\w-]+="[^"]*")*)\s*\/?>/g;
  const attrRe = /([\w-]+)="([^"]*)"/g;

  const elements: UiElement[] = [];
  for (const tag of withoutComments.matchAll(tagRe)) {
    const [, className, attrText] = tag;
    if (className === 'hierarchy') continue;

    const attrs: Record<string, string> = {};
    for (const attr of attrText.matchAll(attrRe)) attrs[attr[1]] = attr[2];

    elements.push({
      className,
      contentDesc: attrs['content-desc'] || undefined,
      resourceId: attrs['resource-id'] || undefined,
      text: attrs['text'] || undefined,
      clickable: attrs['clickable'] === 'true',
      scrollable: attrs['scrollable'] === 'true',
      password: attrs['password'] === 'true',
      bounds: attrs['bounds'],
    });
  }
  return elements;
}

/**
 * The agent ignores pure layout containers. An element is worth locating if
 * the user could interact with it (clickable / editable) or if it carries an
 * identity the agent can assert on (content-desc, resource-id, visible text).
 */
export function interactableElements(elements: UiElement[]): UiElement[] {
  return elements.filter(
    (el) =>
      el.clickable ||
      el.className.includes('EditText') ||
      el.contentDesc !== undefined ||
      (el.resourceId !== undefined && el.text !== undefined),
  );
}

// ── Step 2: rank locator candidates for one element ───────────────────────────

export function rankLocators(el: UiElement): LocatorCandidate[] {
  const candidates: LocatorCandidate[] = [];

  if (el.contentDesc) {
    candidates.push({
      strategy: 'accessibility-id',
      selector: `~${el.contentDesc}`,
      score: 95,
      reason: 'content-desc is set for accessibility — survives copy and layout changes',
    });
  }

  if (el.resourceId) {
    candidates.push({
      strategy: 'resource-id',
      selector: `//*[@resource-id="${el.resourceId}"]`,
      score: 80,
      reason: 'resource-id is developer-assigned — stable unless the view is renamed',
    });
  }

  if (el.text) {
    candidates.push({
      strategy: 'text-xpath',
      selector: `//*[@text="${el.text}"]`,
      score: 40,
      reason: 'visible text — breaks on copy changes and localisation',
    });
  }

  candidates.push({
    strategy: 'class-xpath',
    selector: `//${el.className}`,
    score: 10,
    reason: 'class name only — matches every sibling of the same type; last resort',
  });

  return candidates.sort((a, b) => b.score - a.score);
}

// ── Step 3: the locator map — what the agent "sees" on this screen ────────────

export function buildLocatorMap(xml: string): LocatorMapEntry[] {
  return interactableElements(parseHierarchy(xml)).map((element) => {
    const [best, ...alternatives] = rankLocators(element);
    return { element, best, alternatives };
  });
}

// ── Pretty-printer used by run.ts ─────────────────────────────────────────────

export function formatLocatorMap(map: LocatorMapEntry[]): string {
  const label = (el: UiElement) =>
    el.contentDesc ?? el.text ?? el.resourceId ?? el.className.split('.').pop();

  return map
    .map((entry, i) => {
      const alt = entry.alternatives
        .map((c) => `    · ${c.selector}  (${c.score}) — ${c.reason}`)
        .join('\n');
      return (
        `${String(i + 1).padStart(2)}. ${label(entry.element)}  [${entry.element.className.split('.').pop()}]` +
        `\n    → ${entry.best.selector}  (${entry.best.score}) — ${entry.best.reason}` +
        (alt ? `\n${alt}` : '')
      );
    })
    .join('\n');
}
