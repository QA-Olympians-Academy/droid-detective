#!/usr/bin/env node
'use strict';

/**
 * Locator-review entry point — kept as .js so every documented invocation
 * (`node .github/scripts/review-locators.js`, CI workflows) keeps working.
 * The implementation lives in droid/review/ as TypeScript services:
 *
 *   droid/review/git.service.ts     changed page objects + diff (BASE_SHA…HEAD_SHA)
 *   droid/review/model.service.ts   Ollama brittleness review of the diff
 *   droid/review/report.service.ts  PR comment via gh (best-effort locally: stdout)
 *   droid/review/index.ts           orchestration: diff → review → comment
 */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', target: 'ES2021' } });
require('../../droid/review');
