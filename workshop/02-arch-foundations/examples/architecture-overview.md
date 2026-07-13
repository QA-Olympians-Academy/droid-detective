# Architecture Overview — File-by-File

This document maps the abstract architecture from Chapter 2 to the actual files in the project.

---

## Component map

```
High-Level Goal
      │
      ▼
bot/prompt-templates/SystemPrompt.hbs      ← shapes how the agent reasons
      │
      ▼
bot/ai/agent/app-agent/agent-loop.ts       ← the Think → Act → Observe loop
      │
      ├── bot/ai/agent/tools/element-action.ts         ← tool schemas (what the LLM "sees")
      └── bot/ai/agent/tools/toolCalls/element-action-call.ts  ← tool execution (Appium calls)
                                │
                                ▼
                    WebdriverIO remote()    ← W3C WebDriver client
                                │
                                ▼
                    Appium Server  →  UIAutomator2  →  Android device
```

---

## Layer 1 — Goal intake

**File:** `bot/index.ts`

Parses CLI args, initialises the WebdriverIO session, and passes the test goal string to the agent loop.

```typescript
// Simplified
const goal = args['test-file']
  ? fs.readFileSync(args['test-file'], 'utf8')
  : args.goal

await runAgentLoop({ driver, goal, maxSteps: 20 })
```

Nothing LLM-specific here. This layer is replaceable — you could swap CLI args for a CI matrix, a Confluence page, or a Slack slash command.

---

## Layer 2 — System prompt

**File:** `bot/prompt-templates/SystemPrompt.hbs`

Handlebars template compiled before each run. Sets:
- The agent's identity and purpose
- The tool definitions (in natural language)
- The element identification priority order
- The terminal conditions (`write_test_result` vs `write_error`)

This is the most important file to customise for a new app. Change the locator conventions here; the agent learns them immediately.

---

## Layer 3 — Agent loop

**File:** `bot/ai/agent/app-agent/agent-loop.ts`

Implements the core cycle:

```typescript
while (steps < maxSteps) {
  const dom = await driver.getPageSource()              // Observe
  const response = await llm.chat.completions.create({  // Think — local model (llama3.1)
    model: 'llama3.1',
    messages: [{ role: 'system', content: compiledPrompt }, ...history],
  })
  const toolCall = extractToolCall(response)         // Plan
  const result = await executeTool(toolCall, driver) // Act
  history.push({ role: 'tool', content: result })    // Record
  steps++

  if (toolCall.name === 'write_test_result') break   // Terminal
}
```

The DOM is passed in the user message, not the system prompt — this ensures the agent always sees the *current* state, not a cached snapshot.

---

## Layer 4 — Tool definitions

**File:** `bot/ai/agent/tools/element-action.ts`

Exports the JSON schema array sent to the local model (the LLM):

```typescript
export const tools = [
  {
    name: 'element_action',
    description: 'Interact with a UI element on the device',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['tap', 'type', 'clear', 'scroll'] },
        selector: { type: 'string', description: '~ for accessibility ID ...' },
        text: { type: 'string', description: 'Required for type action' },
      },
      required: ['action', 'selector'],
    },
  },
  // keyboard_action, wait, write_error, write_test_result ...
]
```

Adding a new capability = adding a new entry to this array + an implementation in the `toolCalls/` directory.

---

## Layer 5 — Tool execution

**File:** `bot/ai/agent/tools/toolCalls/element-action-call.ts`

Receives the parsed tool call from the LLM and translates it to WebdriverIO calls:

```typescript
case 'tap':
  const el = await driver.$(selector)
  await el.waitForDisplayed({ timeout: 8000 })
  await el.click()
  return { success: true, action: 'tap', selector }
```

This is the only layer that touches the Appium driver directly. Everything above it is LLM-facing; everything here is device-facing.

---

## AppClaw vs The Bot

| | AppClaw | The Bot |
|---|---|---|
| Source | npm package (closed) | `bot/` in this repo (open) |
| Tool interface | MCP over stdio | Direct WebdriverIO |
| Device | Local emulator | LambdaTest cloud |
| Customisation | Limited | Full — add any tool |
| YAML flows | ✅ Built-in | ❌ Not applicable |
| LLM provider | Ollama / local (llama3.1) | Configurable via OpenRouter |

Both implement the same **Think → Act → Observe** loop. The Bot exists for cases where you need cloud devices, custom tools, or a specific LLM provider.
