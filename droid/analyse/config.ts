/**
 * Configuration for the failure analyser. The LLM endpoint, model, and log
 * location are shared with the self-healer (droid/heal) — one Ollama setup
 * drives both scripts.
 */
export { LLM_API_KEY, LLM_BASE_URL, LOG_FILE, MODEL } from '../heal/config';

/** Set by GitHub Actions; unset locally (the issue body is printed instead). */
export const REPO = process.env.GITHUB_REPOSITORY;
