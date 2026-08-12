// @ts-nocheck
/**
 * CH4 — DOM INTERPRETER  (WORKSHOP EXERCISE STUB)
 *
 * Implement the bodies live during the workshop. The types and signatures
 * below define the API you work against; `run.ts` already wires everything —
 * it will print your locator map once the functions return real data.
 *
 * Goal: read a uiautomator hierarchy the way the agent does — parse it as
 * text, keep the interactable elements, and rank a locator per element using
 * the stability hierarchy:
 *   accessibility-id (95) → resource-id (80) → text (40) → class XPath (10).
 *
 * The full reference implementation is on the main branch:
 *   git checkout main -- examples/ch04-agent-mind
 */

// ── Types (provided — do not change) ─────────────────────────────────────────

export interface UiElement {
  className: string;
  contentDesc?: string;
  resourceId?: string;
  text?: string;
  clickable: boolean;
  scrollable: boolean;
  password: boolean;
  bounds?: string;
}

export type LocatorStrategy = 'accessibility-id' | 'resource-id' | 'text-xpath' | 'class-xpath';

export interface LocatorCandidate {
  strategy: LocatorStrategy;
  selector: string;
  score: number;
  reason: string;
}

export interface LocatorMapEntry {
  element: UiElement;
  best: LocatorCandidate;
  alternatives: LocatorCandidate[];
}

// ── Step 1: parse the hierarchy XML into elements ─────────────────────────────

export function parseHierarchy(xml: string): UiElement[] {
  // TODO(ch4): strip XML comments, walk the tags with a regex
  // (`/<([\w.$]+)((?:\s+[\w-]+="[^"]*")*)\s*\/?>/g` is a good start), and map
  // each tag's attributes onto a UiElement. Skip the <hierarchy> root.
  throw new Error('TODO(ch4): implement parseHierarchy');
}

export function interactableElements(elements: UiElement[]): UiElement[] {
  // TODO(ch4): the agent ignores layout containers. Keep an element if the
  // user can interact with it (clickable, EditText) or if it carries identity
  // (content-desc, or resource-id + text).
  throw new Error('TODO(ch4): implement interactableElements');
}

// ── Step 2: rank locator candidates for one element ───────────────────────────

export function rankLocators(el: UiElement): LocatorCandidate[] {
  // TODO(ch4): build one candidate per available attribute —
  //   content-desc → `~value`                       score 95
  //   resource-id  → `//*[@resource-id="value"]`    score 80
  //   text         → `//*[@text="value"]`           score 40
  //   always       → `//className`                  score 10 (last resort)
  // — with a one-line `reason` each, sorted by score descending.
  throw new Error('TODO(ch4): implement rankLocators');
}

// ── Step 3: the locator map — what the agent "sees" on this screen ────────────

export function buildLocatorMap(xml: string): LocatorMapEntry[] {
  // TODO(ch4): compose steps 1+2: parse → filter → rank; the best candidate
  // goes in `best`, the rest in `alternatives`.
  throw new Error('TODO(ch4): implement buildLocatorMap');
}

// ── Pretty-printer (provided — used by run.ts) ────────────────────────────────

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
