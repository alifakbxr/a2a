---
name: a2a
description: Optional A2A local-first engineering context, impact, acceptance planning, source-aware recovery and token diagnostics for Antigravity.
---

# A2A — native-first engineering support (v2.0.1 candidate)

**Antigravity owns** coding, terminal, browser, model selection, native teamwork, permissions and test execution. A2A has **four public MCP tools** and no third-party runtime packages, agent proxy, browser replacement or automatic project command runner. Repository CI success is not an independently observed application PASS.

## Decide whether A2A helps

1. **No A2A calls** for trivial copy/styles, single isolated edits or direct explanations.
2. For unfamiliar code, prefer one targeted `a2a_context(action="query")`. For risky cross-module work, one `a2a_impact(summary=true)` provides bounded risk/uncertainty; expand only when evidence requires it.
3. For user-visible/stateful defects, plan with `a2a_verify(operation="plan")`: Give each required behavior its own **Given/When/Then**, negative control, evidence type and source revision. For UI/browser cases add viewport, UI state and a reference. Initial state is `not_tested`.
4. Implement and test with **native Antigravity** and existing project tools. When possible reproduce the bug before fixing it, preserve working behavior, and run real negative-path tests.
5. Assess completed machine reports with `a2a_verify(operation="assess")`, mapping each criterion to a **named testcase** (`artifact` and `test_name`). `completion.fully_verified=false` for local reports. A passing build cannot prove visual/browser/hardware/security/independent acceptance. `assess_browser` and `assess_semantic` are **unattested** reviews of supplied JSON.
6. For paused tasks, use `a2a_evidence(operation="save_checkpoint")` only on request, with explicit `task_summary`, `completed`, `next_steps`, `decisions` and `pending_tests`; retrieve via `model_recovery`, checking `source_revision_matches` and `source_freshness`. Saved notes are **not** verified work; never store credentials.
7. For native tool failures optionally use `a2a_evidence(operation="tool_recovery")`. Inspect current browser/page IDs, file versions or tool schema before retrying; never bypass a permission rejection or repeatedly retry identical inputs. This returns guidance only; it cannot observe/intercept native calls.
8. For teamwork, `a2a_context(action="orchestration")` recommends native modes **only when the user/IDE declares them available**, dependencies are low and file ownership is **independent**. Ask for user approval; A2A launches no worker.
9. Final handoff: state what was implemented, the exact assertions that passed, failed, blocked, stale and **not tested**; avoid claiming full completion, release readiness or token savings without corresponding independent evidence.

## 19 November re-audit safeguards

- For acceptance involving several conditions, request explicit `persist_plan:true` before relying on plan-scoped `assess(plan_id=...)`. This stores **private scenario text locally**; never use it implicitly. A bound assessment reports omitted cases as not tested and stale source as stale.
- Native handoffs can verify only the exact named local machine assertions; a passing build or hook event cannot prove visual/browser/hardware/security execution. A native hook run with no confirmed numeric zero exit code is **unknown**, not successful.
- Permission-denied tool errors require approval even when they mention a page ID; never retry with altered authorization.
- Automatic full-content brain Markdown snapshots are **off by default**. Use the actual CLI `node scripts/a2a.mjs artifact-autosnapshot on|off|status` only on explicit user consent; warn that previously retained content is not deleted when turned off.

## CLI controls — actual subcommands

From a checkout, use `node scripts/a2a.mjs` (or the `a2a` executable when installed). Supported examples:

```bash
node scripts/a2a.mjs doctor
node scripts/a2a.mjs mode on-demand
node scripts/a2a.mjs mode always-on
node scripts/a2a.mjs toggle
node scripts/a2a.mjs compact on
node scripts/a2a.mjs autotrust active-only
node scripts/a2a.mjs allow /absolute/project
node scripts/a2a.mjs revoke /absolute/project
node scripts/a2a.mjs tokens --limit 5 --json
```

Do **not** invent or promise plugin chat slash commands not actually exposed by the installed Antigravity runtime. Always-On is **opt-in**, injected via `SessionStart` only; `rules/AGENTS.md` stays small. `PostToolUse` is scoped; there is no `PreInvocation` hook.

## Acceptance, privacy and release

No raw Antigravity brain logs or credentials in public fixtures. An internal transcript token estimate is not provider billing. The behavioral hardening is merged to `v2.0.1` via [PR #36](https://github.com/alifakbxr/a2a/pull/36), with real **local MCP stdio/SQLite E2E in CI**. That is not installed IDE, Figma, printer or STOCKROOM F01–F18 external E2E.

Release remains **NO-GO** until [issue #15](https://github.com/alifakbxr/a2a/issues/15) is independently resolved. `main` remains separate; external signed approval is mandatory before publication. See [documentation index](../../docs/README.md), [behavioral Five Whys](../../docs/BEHAVIORAL_5_WHYS_V2_0_1.md), [contracts](../../docs/CONTRACTS.md), [native workflow](../../docs/NATIVE_FIRST_WORKFLOW.md), and [release authorization](../../docs/RELEASE_AUTHORIZATION.md).
