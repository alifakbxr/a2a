---
name: a2a
description: A2A optional scoped project intelligence, native-first verification and token diagnostics; use for explicit /a2a requests or user-enabled risk-based assistance.
---

# A2A · Native-first, evidence-first

**Antigravity owns** coding, planning, terminal, browser, permissions, and supported agents. A2A provides *local, bounded* context, risk plans and evidence review. **A2A-only: do not introduce external plugins, MCP servers, skills, agents, packages, or browser engines.** Never auto-install anything, spawn workers, run a browser or project command, auto-trust a workspace, or claim independent verification based on self-reported JSON.

## Commands
- `/a2a on-demand` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand` (default)
- `/a2a always-on` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on` (adaptive opt-in)
- `/a2a toggle` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle`
- `/a2a compact [on|off|toggle|status]` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact <value>`
- `/a2a status` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor`
- `/a2a tokens` → `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens` (only on request; historical local counts are not provider billing)

## Decision path (including Always-On)

1. **Early exit: zero A2A calls** for trivial edits, styling, docs, ordinary explanations or tasks already solved by native tools.
2. For unfamiliar symbols, request `a2a_context(action="query")` **only if needed**. For multi-file/risky changes, prefer **one** `a2a_impact(summary=true)`; ask for graph details only to resolve a named uncertainty. Static zero matches never proves safety.
3. For stateful/security/finance/offline changes, run **one** `a2a_verify(operation="plan")` if it materially improves the test plan. Specify negative controls for authorization, payment/ledger, true concurrency, full browser restart and retry **when applicable**, before implementation.
4. **Engineering standard (built into A2A):** match the repository's existing conventions, make the smallest behavior-preserving change, reproduce bugs with a failing regression first, verify observable user/API behavior, and explain compatibility or maintenance cost. On high-risk plans, inspect `maintainer_review` as a **not-reviewed** checklist. These principles draw on Laravel, Vue, SQLite and other open-source maintainers but do **not** import their tooling or enforce their language-specific style. 
5. **Implement and execute with native Antigravity**, respecting all permissions. Native browser and any already-available DevTools checks may produce evidence; never add a second browser runtime. Native Teamwork/Swarm/subagent is **optional**, only when supported, and requires user consent before additional workers.
6. Assess a **named completed machine report** once via `a2a_verify(operation="assess")`, or use `verify_handoff` for workers. Use `assess_semantic` / `assess_browser` only for specific existing artifacts: their results are **unattested**, not an independent pass. Passing test names, screenshots, sequential checkout, or tab reopen alone do not prove full requirements.
7. Keep the final response brief: tested scope, passed/failed/partial/not-tested/stale, known gaps and next action. Use `a2a_evidence` for incidents/history only when needed. Token accounting and A2A summaries are **opt-in**; never fabricate token savings or claim provider usage from local cache estimates.

## Release block on current v2.0.1

The five documented post-merge defects (AUD-01 through AUD-05) are **not fixed by this workflow**. In particular, do not claim release eligibility from potentially self-referential JSON evidence or caller-reduced semantic requirements. Real Antigravity/browser execution and independently run STOCKROOM F01–F18 remain mandatory before promotion to `main`.

See [full native-first workflow](../../docs/NATIVE_FIRST_WORKFLOW.md), [open-source maintainer standards](../../docs/OPEN_SOURCE_ENGINEERING_STANDARDS.md), [independent runbook](../../docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md) and [token evaluation protocol](../../docs/TOKEN_EFFICIENCY.md). All design, maintenance, and verification guidance runs within A2A and native Antigravity only; external resources are research citations, not runtime integrations.
