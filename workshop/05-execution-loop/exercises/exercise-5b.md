# Exercise 5b — Run the Bot

**Time:** 15 minutes  
**Prerequisites:** LambdaTest credentials in `.env` (`LT_USERNAME`, `LT_ACCESS_KEY`, `LT_APP_URL`)

---

## Overview

The custom Bot agent connects to a real LambdaTest cloud device. It uses the same Think → Act → Observe loop as AppClaw but gives you full control over tools, system prompt, and LLM provider.

---

## Part 1 — Read the system prompt (3 min)

Open `bot/prompt-templates/SystemPrompt.hbs`.

Answer:
1. What tools does the system prompt tell the LLM it has?
2. What does it say about element identification priority?
3. What terminal condition ends the loop with `write_test_result`?

---

## Part 2 — Create a smoke test goal (5 min)

```bash
cat > bot/prompt-templates/SmokeTest.md << 'EOF'
### Smoke Test

Test the following and report pass/fail for each:

1. Home screen — verify the WEBDRIVER title is visible
2. Login screen — verify email and password fields are visible
3. Forms screen — verify the text input and the switch are visible
4. Report overall pass/fail with a one-sentence summary
EOF
```

---

## Part 3 — Run and trace the loop (7 min)

```bash
pnpm run bot \
  --lt-user $LT_USERNAME \
  --lt-key  $LT_ACCESS_KEY \
  --app-id  $LT_APP_URL \
  --test-file SmokeTest.md \
  --log-level debug
```

For each iteration of the loop, record:

| Iteration | Think (reasoning) | Act (tool call) | Observe (result) |
|-----------|------------------|----------------|-----------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Part 4 — Add a custom tool (bonus)

Open `bot/ai/agent/tools/element-action.ts` and look at how `element_action` is defined.

Design a new tool for your own app. Write the JSON schema:

```typescript
{
  name: 'your_tool_name',
  description: 'What it does and when the agent should call it',
  input_schema: {
    type: 'object',
    properties: {
      // ...
    },
    required: [],
  },
}
```

Ideas: `mock_biometrics`, `get_network_state`, `shake_device`, `rotate_screen`

---

## Definition of done

- [ ] You can describe the three-part structure of `SystemPrompt.hbs`
- [ ] Smoke test ran against LambdaTest and returned a pass/fail result
- [ ] You filled in at least 3 rows of the loop trace table
- [ ] You can explain why `write_test_result` is a terminal tool
- [ ] (Bonus) JSON schema written for a custom tool
