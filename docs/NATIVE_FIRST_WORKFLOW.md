# A2A Native-First Workflow — v2.0.1 candidate

**Status:** workflow contract for the `v2.0.1` branch. This document is not evidence of external benchmark acceptance or production readiness.

## Purpose and non-goals

A2A augments Antigravity with **scoped project context, risk-aware test planning, evidence accounting, and transparent diagnostics**. Antigravity remains responsible for reasoning, editing, commands, browsers, permissions and any native subagents. A2A must not install extra agents/skills/MCP servers, launch browsers/workers, execute arbitrary project commands, silently trust a workspace, or send source data to external services.

The intended change is **when and how to use existing capabilities**, not adding more tools or default token consumption. Keep exactly four public MCP tools: `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence`. Default to on-demand. Always-on remains opt-in and must retain the early-exit decisions below.

## One-screen decision table

| Situation | A2A calls | Antigravity responsibility |
| --- | --- | --- |
| Readme, styling, simple isolated edit, or question native tools already answer | **Zero** | Solve directly; do not invoke A2A to justify a trivial change |
| Unfamiliar symbol or cross-file ownership | At most one `a2a_context(action="query")` *or* one `a2a_impact(summary=true)` | Inspect exact source only when implementing |
| High-risk cross-module change | One `a2a_impact(summary=true)`; one `a2a_verify(operation="plan")` if an actual test plan is needed | Define negative controls before editing; use existing native test runner |
| Security, tenant, finance, inventory, concurrency, offline, auth or other stateful mutation | High-risk path **plus** domain-specific independent acceptance criteria | Implement, run negative and concurrency tests, inspect backend state; report unavailable tests as not-run |
| Browser/UI behavior | Risk path if warranted; `assess_browser` only when a genuine browser report exists | Use native Antigravity browser and available developer diagnostics; check rendered revision and UX assertions |
| Test report / worker handoff | `assess` or `verify_handoff` **once** for named machine evidence | Execute native tests; never treat test names or broad suite pass as proof of untested scenarios |
| Final release decision | `assess_release` **only after** version-source, evidence-revision, scope, trust-key and semantic blockers are fixed and externally attested | Independent evaluator uses a frozen external acceptance registry and a separate signing key |
| Historic token accounting, incidents, audit trail | On explicit request, use `a2a_context(action="tokens")` or `a2a_evidence` | Reconcile official usage when available; distinguish cache/unknown worker overlap |

## Execution protocol

1. **Classify the task and exit early.** If the native agent can finish without meaningful project-wide risk, use no A2A calls. No automatic repetitive token reports, forced post-processing, or decorative verdicts.
2. **Scope only what changed.** Prefer the user's current task, changed files and the repository's existing tests. Call `a2a_impact` at most once for a scoped high-risk pass; fetch fuller graph detail only when the bounded summary cannot answer a specific question. Treat missing dependencies/tests as **unknown**, never proof of safety.
3. **Freeze actual acceptance criteria before implementation** on high-risk tasks. Have the native agent translate user requirements into testable success and failure cases; include negative paths: role and tenant boundary, server-authoritative totals, duplicate refund, concurrency across independent DB connections, offline browser **process** restart, account switching, response loss and idempotent retry when applicable.
4. **Implement using native Antigravity.** The IDE handles source edits, terminal commands, browser interaction and approvals. Reuse existing tests instead of generating duplicate runners. Suggest native Teamwork/Swarm/subagent/Boost **only if available and materially useful**, and ask the user before invoking potentially costlier parallel workers. No invented command availability.
5. **Verify at the right level.** Run actual unit/integration/E2E tests with native permissions, then call A2A assessment only where machine evidence exists. `assess` proves the scope of named tests only. `assess_semantic` and `assess_browser` are **unattested structural reviews**, never independent security or release approval. Browser evidence must bind source revision, build identity, execution timestamp and explicit assertions; screenshots or passing test names alone do not prove behavior.
6. **Challenge failure modes.** For risky work, deliberately test forbidden routes and background replay, altered IDs, partial payments/refunds, overlapping transactions, persisted offline queue and backend reconciliation, stale builds and no-data cases. If the independent test cannot be run, mark **not-tested**, not passed.
7. **Give a concise human handoff.** State `passed / failed / partial / not-tested / stale` for the **specific tested scope**, unresolved blockers and exact follow-up. Do not infer token savings or causal impact from one run, native worker count, weekly allowance percentage or locally summed cache categories.

## Hard blockers discovered in v2.0.1 audit

These are **code defects**, not fixed by writing a workflow:
- **AUD-01 P0:** Evidence `.json` can change the workspace fingerprint when it contains that fingerprint. Until repaired with an executable Engine regression, do not claim release readiness from self-referential JSON artifacts.
- **AUD-02 P1:** MCP and CLI display version `2.0.0` while manifest/package state `2.0.1`. Release contract tests must enforce version consistency.
- **AUD-03 P1:** Built-in semantic capabilities can be overridden by caller. Mandatory built-ins must form a non-removable minimum before structural semantic support is trusted.
- **AUD-04 P2:** npm tarball excludes the documented benchmark evaluator. Decide whether evaluator is source-checkout-only or distributed; test package contents.
- **AUD-05 P2:** Intervention ledger performs repeated forward searches. Replace with a linear index; performance-test long transcripts.

**Consequently, `v2.0.1 → main` is blocked.** The frozen STOCKROOM F01–F18 acceptance scenarios still require *actual* isolated HTTP/browser/database execution, plus real installed Antigravity MCP/browser smoke testing and comparable repeated A/B trials. Track these externally in [issue #15](https://github.com/alifakbxr/a2a/issues/15).

## Prior research: adopt the lesson, not a second runtime

- [Antigravity slash commands and browser](https://antigravity.google/docs/slash-commands): native `/browser`, optional native Teamwork/Swarm, and ordinary native terminal remain execution owners. Discover actual account and environment capabilities; don't infer from model effort.
- [Chrome Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance): consult **on demand**, when relevant to web platform ergonomics, compatibility, accessibility or performance. Avoid injecting the full guidance into every task or installing another skill automatically.
- [Chrome DevTools integration](https://developer.chrome.com/docs/modern-web-guidance): use browser/devtools evidence **if already available in the native workflow**. A2A validates report metadata and proof scope, not duplicate browser automation or a second Chrome MCP server.
- [Taste Skill](https://www.tasteskill.dev/) and [Impeccable audit](https://impeccable.style/docs/audit/): optional external design *references*, not dependencies or mandatory aesthetic policies. Borrow accessibility, layout clarity and visual QA checks only for relevant UI tasks; do not auto-install or auto-fetch.
- Prior compact-context and deterministic-hook research: load only needed evidence, cache scoped results, avoid repeating full file reads after a bounded index query, and make every proactive action conditional on its measured value. Do **not** advertise a numerical token-reduction percentage without controlled experiments.

## Workflow quality checks

For a future validation run, confirm:
- A trivial task causes **zero** A2A MCP calls; a high-risk task normally requires no more than one scoped impact pass and one verification plan before native execution.
- User approval is required before paid/parallel workers and any external integration installation.
- All four public MCP tools remain present; native permissions and errors remain unchanged.
- Sequential checkout tests cannot count as real concurrency; tab refresh cannot count as full process restart; signed but incomplete acceptance scope cannot qualify for release.
- JSON evidence does not change the **source** revision, while real source changes invalidate evidence, **after AUD-01 is actually fixed**.
- Official usage, local counters, worker overlap and A2A report size remain distinguished, and unfinished runs stay unfinished.
- Native vs. A2A comparisons use matched environments and independent acceptance: optimizing prompt/tool call counts alone is **not** success.

The workflow specification documents intended behavior; actual compliance must be tested with native Antigravity sessions and adversarial fixtures.
