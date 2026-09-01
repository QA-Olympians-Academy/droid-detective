/**
 * Configuration for the PR locator review. The LLM endpoint and model are
 * shared with the self-healer (droid/heal) — one Ollama setup drives all the
 * CI scripts.
 */
export { LLM_API_KEY, LLM_BASE_URL, MODEL } from '../heal/config';

/** Set by GitHub Actions; unset locally (the review is printed instead). */
export const REPO = process.env.GITHUB_REPOSITORY;
export const PR_NUMBER = process.env.PR_NUMBER;
export const BASE_SHA = process.env.BASE_SHA;
export const HEAD_SHA = process.env.HEAD_SHA;
