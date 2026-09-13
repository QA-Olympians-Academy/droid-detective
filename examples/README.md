# Examples — per-chapter exercise code

One directory per code chapter of the workshop. Every example is the complete
reference implementation and the course runs from `main`: run each one, read it,
and change it live. Undo an experiment with `git checkout -- examples/<chapter>`.

| Directory | Chapter | Runs with | Try it |
|-----------|---------|-----------|--------|
| [ch04-agent-mind](ch04-agent-mind/) | [4 — The Agent's Mind](../workshop/04-agent-mind/README.md) | nothing (offline) | `pnpm exec ts-node examples/ch04-agent-mind/run.ts` |
| [ch05-execution-loop](ch05-execution-loop/) | [5 — The Execution Loop](../workshop/05-execution-loop/README.md) | emulator + LLM | `pnpm exec ts-node examples/ch05-execution-loop/run.ts` |
| [ch06-self-healing](ch06-self-healing/) | [6 — Self-Healing](../workshop/06-self-healing/README.md) | nothing (offline) | `node examples/ch06-self-healing/self-healer.js` |
| [ch07-observability](ch07-observability/) | [7 — Observability](../workshop/07-observability/README.md) | nothing (offline) | `pnpm exec ts-node examples/ch07-observability/run.ts` |
| [ch08-appclaw-skills](ch08-appclaw-skills/) | [8 — AppClaw Skills](../workshop/08-appclaw-skills/README.md) | emulator (+ Claude Code for the skills) | `pnpm run claw:flow examples/ch08-appclaw-skills/forms-text.yaml` |
| [ch09-agent-ci](ch09-agent-ci/) | [9 — CI with GitHub Actions](../workshop/09-ci-github/README.md) | Ollama | `node examples/ch09-agent-ci/review-locators.js` |

Chapters 1–3 (story, architecture, setup), 10 and 11 are talk/quiz chapters
with no exercise code.
