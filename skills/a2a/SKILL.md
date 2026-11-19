---
name: a2a
description: Optional, low-overhead local context, impact, test evidence and recovery for Antigravity. Use only when native tools cannot resolve meaningful uncertainty.
---

# A2A — minimal-context workflow

Antigravity performs edits, tests, browser work and approvals. A2A advises via **four** MCP tools; it never executes native tools or launches workers. Default: **On-Demand + Compact**.

## Call budget: 0 → 1 → only if needed

- **0 calls:** clear file/task, typo, UI copy, isolated edit, normal debug with sufficient native context. Use native tools directly.
- **1 targeted call:** unknown symbol → `a2a_context(action="query",query="specific symbol",limit=5)`; cross-file/auth/schema risk → `a2a_impact(changed=["actual/file"],summary=true)`. Choose **one**, not both by default.
- **Second call only for a distinct unanswered decision.** Never automatically chain inspect → query → skeleton → impact. Reuse the same result until source or task scope changes.
- **High-risk behavior:** `a2a_verify(operation="plan")` only when an explicit acceptance matrix is valuable. Specify Given/When/Then, negative paths and evidence type; browser/visual cases need viewport, UI state and reference. Run tests using native tools. `assess` only with a real, named test report; a passing build is **not** visual/hardware/security/independent proof.
- **Persistent acceptance is opt-in:** `persist_plan:true` stores scenario text locally; use returned `plan_id` for complete assessment. On source change, reissue the unchanged scope explicitly; pinned `source_revision` needs review.
- **Resume/error help only when needed:** `a2a_evidence(model_recovery|tool_recovery)`; checkpoints are unverified and source-revision bound. Never bypass permissions or retry identical tool failures.
- **Teamwork:** native only, explicitly available, low-coupling, independent file ownership, user-approved. A2A never starts workers.

## Safety and output

Keep queries small, avoid full-file skeletons unless genuinely needed, and prefer compact summaries. Never auto-request token stats, print repetitive token footers or claim measured savings from size estimates. Do not store credentials. Full brain Markdown auto-snapshots are **off**; enabling retention requires explicit user consent.

Final report: concise **implemented / tested / failed / blocked / not tested** with exact evidence. Local MCP test results and hooks are not independent E2E or release approval. External release gate remains [#15](https://github.com/alifakbxr/a2a/issues/15).

CLI from checkout: `node scripts/a2a.mjs compact on|off`; `mode on-demand|always-on`; `artifact-autosnapshot on|off|status`. These are CLI options, **not** guaranteed IDE slash commands. Full technical contracts: [docs](../../docs/README.md).
