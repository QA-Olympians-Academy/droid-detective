/** Environment-driven configuration for the self-healing run. */
import * as path from 'path';

/** Dry-run: propose + validate patches but do not write files or retry tests. */
export const DRY_RUN = process.env.HEAL_DRY_RUN === '1' || process.env.HEAL_DRY_RUN === 'true';

// Default matches the workshop's local model (PLAYBOOK-3H §0.5); CI passes its
// own smaller LLM_MODEL explicitly (see android-tests.yml).
export const MODEL = process.env.LLM_MODEL || 'llama3.1';

/** Ollama exposes an OpenAI-compatible endpoint; no real key is needed. */
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
export const LLM_API_KEY = process.env.LLM_API_KEY || 'ollama';

export const LOG_FILE = 'appium.log';
export const PAGE_OBJECTS_DIR = path.join(__dirname, '../pageobjects');
export const DOM_SNAPSHOT_DIR = path.join(__dirname, '../../dom-snapshots');
