---
name: a2a
description: Optional, low-overhead local context, impact, test evidence and recovery for Antigravity. Use only when native tools cannot resolve meaningful uncertainty.
---

# A2A — minimal-context workflow

Antigravity performs edits, tests, browser work and approvals. A2A advises via **four** MCP tools; it never executes native tools or launches workers. Default: **On-Demand + Compact**.

## Call budget: 0 → 1 → only if needed

- **0 calls:** clear file/task, typo, UI copy, isolated edit, normal debug with sufficient native context. Use native tools directly.
- **1 targeted call:** unknown symbol → `a2a_context(workspace="<trusted project absolute path>",action="query",query="specific symbol",limit=5)`; cross-file/auth/schema risk → `a2a_impact(workspace="<trusted project absolute path>",changed=["actual/file"],summary=true)`. Choose **one**, not both by default.
- **Second call only for new uncertainty.** Do not chain inspect → query → skeleton → impact. Reuse until source or scope changes.
- **High-risk behavior:** `a2a_verify(operation="plan")` only when an explicit acceptance matrix is valuable. Specify Given/When/Then, negative paths and evidence type; browser/visual cases need viewport, UI state and reference. Run tests using native tools. `assess` only with a real, named test report; a passing build is **not** visual/hardware/security/independent proof.
- **Persistent acceptance is opt-in:** `persist_plan:true` stores scenario text locally; use returned `plan_id` for complete assessment. On source change, reissue the unchanged scope explicitly; pinned `source_revision` needs review.
- **Adaptive 5 Whys:** for recurring, regressed, high-risk or unclear bugs, native agent checks symptoms, 1–2 competing causes, falsifiers and a discriminating experiment. Ask 2–8 Whys only as evidence requires, not five MCP calls. Persist RCA only with consent: `a2a_evidence(record_incident|add_hypothesis|assess_hypothesis,persist_rca=true)`; require fresh exact named tests. `locally_supported` is **not** causal proof; retest after edits.
- **Resume/error help only when needed:** `a2a_evidence(model_recovery|tool_recovery)`; checkpoints are unverified and source-revision bound. Never bypass permissions or retry identical tool failures.
- **Teamwork:** native only, explicitly available, low-coupling, independent file ownership, user-approved. A2A never starts workers.

## Safety and output

Keep queries small; use Compact and never claim savings from estimates or auto-request token stats. Do not store credentials. Full brain Markdown auto-snapshots are **off**; enabling retention requires explicit user consent.

Final report: **implemented / tested / failed / blocked / not tested**, with scoped evidence. Local results are not independent E2E; release [#15](https://github.com/alifakbxr/a2a/issues/15) remains open.

CLI: `node scripts/a2a.mjs compact on|off`; `mode on-demand|always-on`; `artifact-autosnapshot on|off|status`. Not guaranteed IDE slash commands. [Docs](../../docs/README.md).
