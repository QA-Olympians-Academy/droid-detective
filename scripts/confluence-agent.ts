#!/usr/bin/env ts-node
/**
 * Confluence Test Agent
 *
 * Reads a Confluence page (acceptance criteria / user stories) and generates:
 *   - AppClaw YAML flows  →  flows/<name>.yaml
 *   - WebdriverIO spec    →  droid/specs/<name>.spec.ts
 *
 * Usage:
 *   pnpm run agent:confluence <page-id-or-url>
 *
 * Required env vars (add to .env):
 *   ANTHROPIC_API_KEY, CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONFLUENCE_BASE = (process.env.CONFLUENCE_BASE_URL ?? '').replace(/\/$/, '')
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL ?? ''
const CONFLUENCE_TOKEN = process.env.CONFLUENCE_API_TOKEN ?? ''

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPageId(input: string): string {
    if (/^\d+$/.test(input.trim())) return input.trim()
    const m = input.match(/\/pages\/(\d+)/)
    if (m) return m[1]
    throw new Error(`Cannot extract page ID from: ${input}`)
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function confluenceHeaders(): Record<string, string> {
    const creds = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_TOKEN}`).toString('base64')
    return { Authorization: `Basic ${creds}`, Accept: 'application/json' }
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function fetchConfluencePage(pageIdOrUrl: string): Promise<string> {
    if (!CONFLUENCE_BASE || !CONFLUENCE_EMAIL || !CONFLUENCE_TOKEN) {
        return [
            'Error: Confluence credentials missing.',
            'Set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN in .env',
        ].join('\n')
    }

    let pageId: string
    try { pageId = extractPageId(pageIdOrUrl) }
    catch (e) { return `Error: ${(e as Error).message}` }

    const url = `${CONFLUENCE_BASE}/wiki/rest/api/content/${pageId}?expand=body.view,title,space,version`

    let res: Response
    try { res = await fetch(url, { headers: confluenceHeaders() }) }
    catch (e) { return `Network error fetching page: ${(e as Error).message}` }

    if (!res.ok) {
        const body = await res.text().catch(() => '')
        return `Confluence API error ${res.status} ${res.statusText}:\n${body.slice(0, 400)}`
    }

    const data = await res.json() as Record<string, unknown>
    const title   = (data.title as string) ?? '(untitled)'
    const space   = ((data.space as Record<string, string>)?.name) ?? ''
    const version = ((data.version as Record<string, number>)?.number) ?? 1
    const html    = ((data.body as Record<string, Record<string, string>>)?.view?.value) ?? ''
    const text    = stripHtml(html)

    return `# ${title}\nSpace: ${space} | Version: ${version} | ID: ${pageId}\n\n${text}`
}

async function searchConfluencePages(query: string, spaceKey?: string): Promise<string> {
    if (!CONFLUENCE_BASE || !CONFLUENCE_EMAIL || !CONFLUENCE_TOKEN) {
        return 'Error: Confluence credentials missing in .env'
    }

    const cql = spaceKey
        ? `text ~ "${query}" AND space = "${spaceKey}" ORDER BY lastmodified DESC`
        : `text ~ "${query}" ORDER BY lastmodified DESC`

    const url = `${CONFLUENCE_BASE}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=10`

    let res: Response
    try { res = await fetch(url, { headers: confluenceHeaders() }) }
    catch (e) { return `Network error: ${(e as Error).message}` }

    if (!res.ok) return `Confluence search error ${res.status} ${res.statusText}`

    const data = await res.json() as { results?: Array<Record<string, unknown>> }
    const results = data.results ?? []

    if (results.length === 0) return `No pages found for: "${query}"`

    return results.map(r => {
        const id    = r.id as string
        const title = r.title as string
        const space = ((r.space as Record<string, string>)?.name) ?? ''
        return `- [${id}] ${title} (${space})`
    }).join('\n')
}

function readProjectFile(relativePath: string): string {
    const fullPath = path.resolve(relativePath)
    if (!fs.existsSync(fullPath)) return `File not found: ${relativePath}`
    return fs.readFileSync(fullPath, 'utf8')
}

function writeAppClawFlow(filename: string, content: string): string {
    const dir = path.resolve('flows')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, filename.endsWith('.yaml') ? filename : `${filename}.yaml`)
    fs.writeFileSync(file, content, 'utf8')
    return `Written: ${file}`
}

function writeWdioSpec(filename: string, content: string): string {
    const dir = path.resolve('droid/specs')
    const file = path.join(dir, filename.endsWith('.spec.ts') ? filename : `${filename}.spec.ts`)
    fs.writeFileSync(file, content, 'utf8')
    return `Written: ${file}`
}

// ── Tool dispatch ─────────────────────────────────────────────────────────────

type ToolInput = Record<string, string>

async function runTool(name: string, input: ToolInput): Promise<string> {
    switch (name) {
        case 'fetch_confluence_page':
            return fetchConfluencePage(input.page_id)
        case 'search_confluence_pages':
            return searchConfluencePages(input.query, input.space_key)
        case 'read_project_file':
            return readProjectFile(input.path)
        case 'write_appclaw_flow':
            return writeAppClawFlow(input.filename, input.content)
        case 'write_wdio_spec':
            return writeWdioSpec(input.filename, input.content)
        default:
            return `Unknown tool: ${name}`
    }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
    {
        name: 'fetch_confluence_page',
        description:
            'Fetch a Confluence page by its numeric ID or full URL. ' +
            'Returns the page title and body as plain text. Always call this first to read requirements.',
        input_schema: {
            type: 'object' as const,
            properties: {
                page_id: {
                    type: 'string',
                    description:
                        'Numeric page ID or full Confluence page URL. ' +
                        'Example: "123456789" or "https://org.atlassian.net/wiki/spaces/QA/pages/123456789/Title"',
                },
            },
            required: ['page_id'],
        },
    },
    {
        name: 'search_confluence_pages',
        description:
            'Search Confluence for pages matching a query. Useful when you need to find related pages ' +
            'such as test data, environment details, or related feature specs.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'Full-text search terms' },
                space_key: {
                    type: 'string',
                    description: 'Optional Confluence space key to restrict results, e.g. "QA" or "PROD"',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'read_project_file',
        description:
            'Read an existing file from the droid-detective project. ' +
            'Use this before writing tests to understand existing patterns, selectors, and page objects.',
        input_schema: {
            type: 'object' as const,
            properties: {
                path: {
                    type: 'string',
                    description:
                        'Relative path from project root. ' +
                        'Examples: "droid/pageobjects/main.page.ts", "droid/specs/example.spec.ts"',
                },
            },
            required: ['path'],
        },
    },
    {
        name: 'write_appclaw_flow',
        description:
            'Write an AppClaw YAML flow file to the flows/ directory. ' +
            'Use phased format (setup / steps / assertions). ' +
            'Use ${secrets.email} and ${secrets.password} for credentials — never hardcode them.',
        input_schema: {
            type: 'object' as const,
            properties: {
                filename: {
                    type: 'string',
                    description: 'Filename only, e.g. "login-valid.yaml". Do not include a path.',
                },
                content: {
                    type: 'string',
                    description: 'Full YAML content of the flow file.',
                },
            },
            required: ['filename', 'content'],
        },
    },
    {
        name: 'write_wdio_spec',
        description:
            'Write a WebdriverIO TypeScript spec file to droid/specs/. ' +
            'Follow the POM pattern: import mainPage from pageobjects, use describe/it/beforeEach, ' +
            'use expect() matchers (toBeDisplayed, toHaveText, toHaveValue).',
        input_schema: {
            type: 'object' as const,
            properties: {
                filename: {
                    type: 'string',
                    description: 'Filename only, e.g. "login.spec.ts". Do not include a path.',
                },
                content: {
                    type: 'string',
                    description: 'Full TypeScript content of the spec file.',
                },
            },
            required: ['filename', 'content'],
        },
    },
]

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `\
You are a mobile test automation engineer working on droid-detective — a TypeScript Android test \
suite using WebdriverIO, Appium, and AppClaw.

## Your job
Given a Confluence page, extract every test scenario / acceptance criterion and produce:
1. One or more AppClaw YAML flow files (flows/)
2. One WebdriverIO TypeScript spec file (droid/specs/) covering all scenarios

Always read the page first, then read the existing project files for context, then generate and write.

## Demo app — accessibility IDs

Home screen:    ~Home-screen  |  title: WEBDRIVER (XPath)
Login screen:   ~Login-screen, ~button-login-container, ~button-sign-up-container,
                ~input-email, ~input-password, ~button-LOGIN
Forms screen:   ~Forms-screen, ~text-input, ~input-text-result,
                ~switch, ~switch-text, ~button-Active, ~button-Inactive, ~Dropdown
Nav tabs:       ~Home  ~Webview  ~Login  ~Forms  ~Swipe  ~Drag

Valid credentials: alice@example.com / 10203040
After valid login:   TextView contains "logged in"
After invalid login: TextView contains "not recognized"

## AppClaw YAML — phased format

\`\`\`yaml
name: <descriptive name>
platform: android
env: dev
---
setup:
  - open demo app
  - wait until Home screen is visible

steps:
  - tap Login tab
  - type '\${secrets.email}' in email field
  - type '\${secrets.password}' in password field
  - tap LOGIN button

assertions:
  - verify 'logged in' is visible
  - done: <success message>
\`\`\`

Rules:
- One flow per distinct user journey (login, forms, navigation, etc.)
- Always use \${secrets.email} / \${secrets.password} for credentials
- setup: phase resets state so the flow is idempotent
- assertions: phase verifies the expected outcome

## WebdriverIO spec — required pattern

\`\`\`typescript
import mainPage from '../pageobjects/main.page.js'

describe('<Feature>', () => {
    beforeEach(async () => {
        await mainPage.loginTab.click()
        await $('~Login-screen').waitForDisplayed()
    })

    it('should <behaviour>', async () => {
        await mainPage.login('alice@example.com', '10203040')
        const msg = await $('//android.widget.TextView[contains(@text,"logged in")]')
        await expect(msg).toBeDisplayed()
    })
})
\`\`\`

Available matchers: toBeDisplayed(), toHaveText(), toHaveValue(), toBeEnabled(), toBeChecked()
Available mainPage members: loginTab, usernameField, passwordField, submitButton, login(), typeText()

## Workflow (follow this order)
1. fetch_confluence_page — read the requirements
2. read_project_file("droid/pageobjects/main.page.ts") — understand selectors
3. read_project_file("droid/specs/example.spec.ts") — understand spec patterns
4. write_appclaw_flow — one file per distinct flow
5. write_wdio_spec — one file covering all scenarios from the page

If the Confluence page is not specifically about tests, infer what test scenarios would validate \
the described functionality on the demo app.`

// ── Agent loop ────────────────────────────────────────────────────────────────

async function runAgent(pageIdOrUrl: string): Promise<void> {
    console.log('\nConfluence Test Agent')
    console.log('─'.repeat(40))
    console.log(`Page: ${pageIdOrUrl}\n`)

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content:
                `Read the Confluence page at: ${pageIdOrUrl}\n\n` +
                `Then generate both:\n` +
                `  1. AppClaw YAML flow(s) in flows/\n` +
                `  2. A WebdriverIO spec in droid/specs/\n\n` +
                `Base the tests on the requirements, acceptance criteria, or user stories on that page.`,
        },
    ]

    const MAX_TURNS = 20

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        const response = await client.messages.create({
            model: 'claude-opus-4-7',
            max_tokens: 8192,
            system: SYSTEM,
            tools: TOOLS,
            messages,
        })

        // Print any reasoning / commentary the model emits
        for (const block of response.content) {
            if (block.type === 'text' && block.text.trim()) {
                console.log(block.text)
            }
        }

        if (response.stop_reason === 'end_turn') {
            console.log('\n✓ Done')
            break
        }

        const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        )
        if (toolUses.length === 0) break

        messages.push({ role: 'assistant', content: response.content })

        const results: Anthropic.ToolResultBlockParam[] = []

        for (const use of toolUses) {
            const label = `${use.name}(${JSON.stringify(use.input).slice(0, 60)}…)`
            process.stdout.write(`  → ${label}\n`)

            const output = await runTool(use.name, use.input as ToolInput)

            const preview = output.slice(0, 100).replace(/\n/g, ' ')
            console.log(`    ✓ ${preview}${output.length > 100 ? '…' : ''}`)

            results.push({ type: 'tool_result', tool_use_id: use.id, content: output })
        }

        messages.push({ role: 'user', content: results })
    }
}

// ── Entry ─────────────────────────────────────────────────────────────────────

const input = process.argv[2]

if (!input) {
    console.error('Usage: pnpm run agent:confluence <page-id-or-url>')
    console.error()
    console.error('Examples:')
    console.error('  pnpm run agent:confluence 123456789')
    console.error('  pnpm run agent:confluence https://yourorg.atlassian.net/wiki/spaces/QA/pages/123456789')
    process.exit(1)
}

// Load .env if present
try {
    const envPath = path.resolve('.env')
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n')
        for (const line of lines) {
            const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
            if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '')
        }
    }
} catch { /* ignore */ }

runAgent(input).catch(err => {
    console.error('\nAgent error:', err.message)
    process.exit(1)
})
