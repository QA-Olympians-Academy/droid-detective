# Chapter 9 — Future Outlook: Next-Gen Mobile QA Systems

**Duration:** 20 minutes  
**Format:** Presentation + discussion  
**Prerequisites:** none — this chapter is a capstone, not a hands-on session

---

## Where we are today

The stack built in this course is production-ready, but it represents the first generation of agentic mobile QA. Current capabilities:

| Capability | Status |
|---|---|
| Single-agent loop (Think → Act → Observe) | ✅ Production |
| DOM-based locator healing | ✅ Production |
| YAML flow generation | ✅ Production |
| AI-generated failure analysis | ✅ Production |
| Multi-agent coordination | 🔬 Early research |
| Reinforcement learning from test outcomes | 🔬 Research |
| Natural-language test authoring at scale | 🚀 Emerging |
| Production-grade guardrails | 🚀 Emerging |

---

## Multi-agent setups

The natural evolution of a single agent loop is a **team of specialised agents**:

```
Coordinator agent
      │
      ├── Locator specialist     — maintains the accessibility ID map
      ├── Flow specialist        — generates and validates YAML flows
      ├── Healing specialist     — patches selectors on failure
      └── Observability agent    — monitors confidence, reports trends
```

Each specialist agent has a narrow context and a narrow skill set. The coordinator routes work to the right specialist and assembles results.

**Why this matters for QA:** different parts of the test suite degrade at different rates. A multi-agent system can assign healing bandwidth where it is most needed, rather than applying a single healing strategy uniformly.

**Current challenge:** agent coordination is expensive. Communication between agents has latency and cost. The architecture is viable today but requires careful scoping.

---

## Reinforcement learning from test outcomes

Today, a healed selector is committed by the engineer after review. In future systems:

1. The agent heals a selector
2. The healed test passes in CI for N consecutive runs
3. The system **infers** the heal was correct and increases selector confidence
4. Selectors with consistently high confidence are promoted to "trusted" — no review required

This is a form of reinforcement learning: the test outcomes are the reward signal, the selector choices are the policy, and "stable across N runs" is the terminal reward condition.

**Current challenge:** distinguishing "the fix was correct" from "the fix accidentally worked but will break under a different condition." Requires a held-out validation set of test scenarios.

---

## Test authoring through natural language at scale

Today: one engineer writes one goal → one agent generates one spec.

Future: a product manager uploads a user story → the system generates a full test scenario tree → engineers review and approve.

The prerequisite is not model capability (models can do this today) — it is **trust infrastructure**: humans need confidence that AI-generated tests are testing the right things before they approve them for CI.

Building trust infrastructure means:
- Every generated test has a traceable origin (which requirement, which agent run)
- Generated tests are diff-viewable against human-written tests
- Confidence scores are visible before approval

---

## Production-grade guardrails

Current workshops and demos omit guardrails. Production systems require them:

| Risk | Guardrail |
|---|---|
| Agent actions outside test scope | Allowlist of permitted selectors per run |
| Healing introduces incorrect selector | Human review gate before merge |
| Agent generates PII in test data | Credential isolation (env files, secret stores) |
| Agent retries beyond step limit | Hard cap + write_error on timeout |
| Agent misidentifies screen | Screen validation step before action |

None of these are hard engineering problems. They are **policy decisions** that must be made explicitly. The guardrails that exist in this project (env files, `MAX_STEPS`, terminal tools) are the starting point — not the end state.

---

## Discussion

1. Which of these future directions would have the highest ROI for your current team?
2. What is the trust barrier that would prevent your organisation from adopting AI-generated tests in CI today?
3. If you had to describe what "Level 5 autonomous testing" looks like in 5 years — what would it include that today's systems cannot do?
4. Where does human judgment remain irreplaceable in this future system?
