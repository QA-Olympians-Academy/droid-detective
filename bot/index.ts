/* eslint-disable */
import { readFileSync } from 'fs';
import { join } from 'path';

import { callAgentInit } from '@Ai/Bot/Agent/app-agent/agent-init';
import { opts } from '@Ai/Bot/Command/command';
import { LLMModel, OpenAIModel } from '@Ai/Bot/Providers/models';
import { logger, parseLogLevel } from '@Ai/Bot/Utils/logger';
import dotenv from 'dotenv';
import Handlebars from 'handlebars';
import { remote } from 'webdriverio';

dotenv.config();

async function main() {
  logger.setLogLevel(parseLogLevel(opts.logLevel as string));

  logger.info('🚀 Starting mobile app test...');
  logger.info('📋 Options:', opts);

  const bundleId = (opts.bundleId as string) || process.env.DEFAULT_BUNDLE_ID;
  const lt_user = opts.ltUser as string;
  const lt_key = opts.ltKey as string;
  const app_id = opts.appId as string;

  if (!bundleId && !lt_user && !lt_key && !app_id) {
    throw new Error('Required parameters missing: bundleId, lt_user, lt_key');
  }

  const driver = await remote({
    logLevel: 'warn',
    user: lt_user,
    key: lt_key,
    hostname: 'mobile-hub.lambdatest.com',
    capabilities: {
      'appium:bundleId': bundleId,
      'appium:newCommandTimeout': parseInt(opts.timeout as string) || 240,
      'lt:options': {
        build: process.env.BUILD_NAME || '[Android] Local Mobile Android Tests with AI Agent',
        name: '[Android] Mobile Android Tests with AI Agent',
        deviceName: 'Pixel 8 Pro',
        platformName: (opts.platform as string) || 'android',
        platformVersion: (opts.version as string) || process.env.DEFAULT_OS_VERSION || '14',
        // @ts-ignore
        enableImageInjection: true,
        deviceOrientation: 'portrait',
        idleTimeout: 300,
        isRealMobile: true,
        privateCloud: false,
        autoGrantPermissions: true,
        enableBiometricsAuthentication: false,
        // @ts-ignore
        automationName: opts.platform === 'android' ? 'UiAutomator2' : 'XCUITest',
        autoAcceptAlerts: true,
        app: `lt://` + app_id,
        network: true,
        devicelog: true,
        appProfiling: true,
      },
    },
  });

  try {
    logger.log('✅ App launched successfully!');

    let testPrompt = opts.testPrompt as string;
    if (!testPrompt) {
      try {
        const testFilePath = opts.testFile ?? 'DefaultTest.md';
        const defaultTestPath = join(__dirname, 'prompt-templates', testFilePath);
        testPrompt = readFileSync(defaultTestPath, 'utf-8');
        logger.info('📝 Loaded test instructions from', testFilePath);
      } catch (error: unknown) {
        logger.warn('⚠️  Could not load default_test, using fallback prompt', error);
        testPrompt = 'I want to login';
      }
    }

    const systemPromptTemplate = Handlebars.compile(
      readFileSync(join(__dirname, 'prompt-templates', 'SystemPrompt.hbs'), 'utf-8'),
    );

    const systemPrompt = systemPromptTemplate({
      companyName: process.env.COMPANY_NAME,
      companyDescription: process.env.COMPANY_DESCRIPTION,
      appName: process.env.APP_NAME || 'Demo Banking App',
      appDescription:
        process.env.APP_DESCRIPTION ||
        'A mobile banking application that allows users to manage their finances, make transactions, and monitor their accounts securely and conveniently.',
    });

    const waitTime = parseInt(opts.wait as string) || 2000;
    await driver.pause(waitTime);

    const results = await callAgentInit(
      testPrompt,
      systemPrompt,
      driver,
      (process.env.LLM_MODEL as LLMModel) || OpenAIModel.GPT_4o,
    );
    logger.log('[ test complete ]', results);
  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    await driver.deleteSession();
    logger.log('🔚 Session closed');
  }
}

main().catch(logger.error);
