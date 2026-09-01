#!/usr/bin/env node
'use strict';

/**
 * Self-healing entry point — kept as .js so every documented invocation
 * (`node .github/scripts/heal-and-retry.js`, CI workflows, the playbook)
 * keeps working. The implementation lives in droid/heal/ as TypeScript
 * services:
 *
 *   droid/heal/appium-log.service.ts     parse appium.log → genuine selector failures
 *   droid/heal/dom.service.ts            failure-time DOM snapshots + existence guard
 *   droid/heal/page-objects.service.ts   page-object IO + string/TS-parse safety checks
 *   droid/heal/model.service.ts          Ollama prompt, call/retry loop, output parsing
 *   droid/heal/deterministic.service.ts  DOM-derived ground-truth patches (no LLM)
 *   droid/heal/patch.service.ts          guarded patch application (override/reject)
 *   droid/heal/index.ts                  orchestration: log → evidence → heal → retry
 */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', target: 'ES2021' } });
require('../../droid/heal');
