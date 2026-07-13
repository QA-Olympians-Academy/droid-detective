# Chapter 2 — Architectural Foundations of Agentic Mobile Test Automation

**Duration:** 25 minutes  
**Prerequisites:** Chapter 1 complete

---

## Learning objectives

- Map the components of a traditional Appium pipeline
- Understand how MCP and LLM agents extend that pipeline
- Identify where DOM interpretation differs from DOM scraping
- Recognise the role of observability feedback loops

---

## Traditional Appium pipeline

```
Test Script (TypeScript/Python)
      │  W3C WebDriver commands
      ▼
Appium Server  →  UIAutomator2  →  Android app
```

Characteristics:
- Every step is predefined in code
- Failures are unrecoverable without code changes
- DOM access is manual: developer writes `$('~selector')`
- No reasoning — the script either matches or fails

---

## Agentic pipeline

```
High-Level Test Goal (plain English)
            │
            ▼
      LLM Agent  ◄──────────────────────────────┐
            │  "What should I do next?"          │
            │  tool calls                        │
            ▼                                    │
      MCP Layer                                  │
      ├── get_page_source()                      │
      ├── tap(selector)                          │
      ├── type(selector, text)                   │
      └── assert_visible(selector)               │
            │  W3C WebDriver commands            │
            ▼                                    │
      Appium Server → UIAutomator2 → Android app │
            │  New DOM state / result            │
            └────────────────────────────────────┘
```

Each pass through the loop is: **Think → Act → Observe → Repeat**

---

## The four architectural components

### 1. Appium — the low-level executor

Unchanged from traditional automation. Appium translates WebDriver commands into UIAutomator2 instructions on device. The agent calls Appium indirectly through MCP tools — it never writes WebDriver code.

### 2. MCP — the orchestrator

The Model Context Protocol defines the tool interface between the LLM and Appium. Each tool is a typed function call:

```typescript
// The agent calls this:
get_page_source()                   // → XML DOM string

// The agent calls this:
tap({ selector: "~LOGIN-button" })  // → success / error

// The agent calls this:
type({ selector: "~email-input", text: "alice@example.com" })
```

MCP separates **what to do** (the agent's decision) from **how to do it** (the tool implementation).

### 3. LLM Agent — the decision-maker

The agent receives:
- The current test goal
- The current DOM state (from the last `get_page_source()` call)
- The history of actions taken so far

It produces:
- A reasoning trace (chain of thought)
- A tool call (the next action)

This cycle repeats until the agent calls a terminal tool (`write_test_result`) or the step limit is reached.

### 4. Observability feedback loop

Every agent run produces:
- Structured reasoning traces (what the agent was thinking)
- Action logs (what it did and the result)
- Confidence signals (did the DOM match expectations?)

These feed back into analysis tools, dashboards, and — in the healing case — patch suggestions.

---

## DOM interpretation vs DOM scraping

| | DOM scraping | DOM interpretation |
|---|---|---|
| Input | Raw XML string | Parsed accessibility tree with context |
| Process | Regex / string match | Semantic reasoning |
| Output | Matching node | Understanding of element role and relationships |
| Breaks when | Selector changes | Structural meaning changes |
| Example | `$('~email-input')` | "There is a text input for an email address" |

Scraping is what traditional Appium does. Interpretation is what the LLM does when it reads the XML hierarchy and decides which element serves the current purpose.

---

## Action planning under uncertainty

Classical automation assumes certainty: the element will be there, the timing will hold, the state will match. Agents plan under uncertainty:

```
Goal: "Verify the checkout total matches the item prices"

Agent plan:
1. Check current screen — am I on the cart?
2. If not, find and tap the cart tab
3. Read all item prices from the product list
4. Find the total element
5. Calculate expected total
6. Assert total equals sum of items
7. If assertion fails — re-read DOM to confirm, then write_error with details
```

The agent adjusts the plan at step 1 based on what it actually sees, not what the script assumed would be true.

---

## See the architecture in code

See [examples/architecture-overview.md](examples/architecture-overview.md) for annotated file-by-file breakdown of how the components connect in this project.

---

## Exercise

Draw the request-response flow for this scenario:

> The agent is asked to "log in with valid credentials and verify the home screen is visible."  
> The first `get_page_source()` call returns a DOM that does not contain the Login tab.

Map which component detects the unexpected state, which component decides what to do next, and which component executes the recovery.
