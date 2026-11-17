---
name: a2a
description: A2A plugin management, scoped code intelligence, verification, and token diagnostics; use for explicit /a2a requests.
---

# A2A · Native-first

A2A is optional intelligence for Antigravity, not a replacement for its native editor, test runner, browser or agents.

## Modes
- `/a2a on-demand` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand` (default)
- `/a2a always-on` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on` (adaptive, opt-in)
- `/a2a toggle` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle`
- `/a2a compact [on|off|toggle|status]` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact <value>`
- `/a2a status` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor`
- `/a2a tokens` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/workspace`

## Always-On decision policy
1. **Skip** A2A for trivial, docs, styles, isolated edits, analysis-only or when native tools already answer the question.
2. For cross-module or high-risk changes, call `a2a_impact` **once** with `summary=true`. If its output is sufficient, do not call extra A2A context tools. Request full detail only when necessary; uncertainty remains mandatory.
3. For unfamiliar symbols, use `a2a_context(action="query", query="...")`. Use `action="skeleton"` only for preliminary navigation; never repeat the same content with a native full-file read unless implementations are needed.
4. For testable behavior changes, run relevant native tests then assess the existing machine report **once** via `a2a_verify(operation="assess", criteria=[...])`. Skip forced machine reports for research/documentation-only tasks.
5. For worker code handoffs, use `a2a_verify(operation="verify_handoff", criteria=[...])` on relevant evidence. Native Teamwork orchestration remains responsible for choosing workers.
6. Do not invoke token telemetry, repeat output summaries, or append an A2A footer unless explicitly requested. Preserve errors, uncertainty, freshness and unresolved checks.

Use `a2a_evidence` only when incident history or artifact history materially helps. Token savings in A2A are *source/output size estimates*, not measured task-level reductions. See [evaluation protocol](../../docs/TOKEN_EFFICIENCY.md).
