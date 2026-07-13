import type { Options } from '@wdio/types'
import path from 'node:path'
import fs from 'node:fs'

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
    },

    // On a failed test, capture the LIVE DOM of the screen the failure happened on
    // (the app is still on that screen here). Self-healing reads these snapshots so
    // the model sees the real element/accessibility id instead of guessing.
    afterTest: async function (test, _context, { passed }) {
        if (passed) return
        try {
            const xml = await browser.getPageSource()
            const dir = path.resolve(__dirname, '../dom-snapshots')
            fs.mkdirSync(dir, { recursive: true })
            const name = test.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)
            fs.writeFileSync(path.join(dir, `${name}.xml`), xml)
        } catch {
            /* best effort — never fail the run because a snapshot couldn't be saved */
        }
    }
}
