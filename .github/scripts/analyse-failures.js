#!/usr/bin/env node
'use strict';

/**
 * Failure-analysis entry point — kept as .js so every documented invocation
 * (`node .github/scripts/analyse-failures.js`, CI workflows) keeps working.
 * The implementation lives in droid/analyse/ as TypeScript services:
 *
 *   droid/analyse/appium-log.service.ts  failed selectors (reuses droid/heal's parser)
 *   droid/analyse/model.service.ts       Ollama summary + static fallback body
 *   droid/analyse/report.service.ts      GitHub issue creation (best-effort)
 *   droid/analyse/index.ts               orchestration: log → selectors → summary → issue
 */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', target: 'ES2021' } });
require('../../droid/analyse');
