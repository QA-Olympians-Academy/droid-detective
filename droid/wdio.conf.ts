import type { Options } from '@wdio/types'
import path from 'node:path'

// Resolve the APK relative to THIS config file, not the process cwd,
// so `pnpm test` works from the repo root and in CI alike.
const APP_PATH = path.resolve(__dirname, '../apps/demo.apk')

export const config: Options.Testrunner = {
    runner: 'local',

    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: '../tsconfig.json'
        }
    },

    specs: ['./specs/**/*.spec.ts'],
    exclude: [],

    maxInstances: 1,

    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'emulator-5554',
        'appium:automationName': 'UiAutomator2',
        'appium:app': APP_PATH,
        'appium:noReset': false,
        'appium:newCommandTimeout': 240
    }],

    logLevel: 'info',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    services: [
        ['appium', {
            command: 'appium',
            args: {
                relaxedSecurity: true,
                log: path.resolve(__dirname, '../appium.log')
            }
        }]
    ],

    framework: 'mocha',
    reporters: ['spec'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
}
