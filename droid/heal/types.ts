/** Shared types for the self-healing services. */

/** A selector that genuinely failed during the test run (never resolved). */
export interface SelectorFailure {
    /** Human-readable error line, shown to the model as context. */
    error: string;
    /** The WDIO selector form as written in the page objects, e.g. `~Carousel`. */
    selector: string;
}

/** A proposed selector fix — from the model or derived from the DOM. */
export interface Patch {
    /** Page object filename, e.g. `swipe.page.ts`. */
    file: string;
    /** The failing selector, verbatim. */
    oldSelector: string;
    /** The corrected selector. */
    newSelector: string;
    /** Short human-readable justification. */
    reason: string;
}

/** Page object sources keyed by filename. */
export type PageObjects = Record<string, string>;
