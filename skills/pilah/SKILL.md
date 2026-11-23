---
name: pilah
description: Native-first engineering assistance for scoped code changes, cross-file impact, root cause investigation and verifiable results. Use for risky or unclear coding tasks, not routine edits.
---

# PILAH — Project Intelligence, Logic, Analysis & Handoffs

Antigravity is the executor. PILAH is a small, read-first assistant, not a substitute agent or automatic test runner.

## 0 calls → 1 precise call → more only if new evidence

1. **0 calls:** clear tasks, isolated changes, known bug, trivial UI text. Use the existing project code and native tools.
2. **Before coding:** define the complete scope (callers, tests, config, security boundaries). Ask in order: is it necessary? already implemented? available through the platform/standard library? existing dependency? otherwise the smallest readable change.
3. **1 call when uncertainty matters:** eager `pilah_context(workspace="<trusted project>",action="query",query="<specific symbol>",limit=5)`; for an identified risky change, discover lazy `pilah_impact` schema and use a scoped file list. Never run both reflexively.
4. **Debugging:** reproduce the symptom, identify a falsifiable root-cause hypothesis, make the smallest correcting change. Use adaptive 5 Whys only for repeated, high-risk or unclear failures. No mandatory five-question ceremony for simple bugs.
5. **Evidence:** if correctness is nontrivial, use native tests, realistic negative cases and exact named reports. `pilah_verify(operation="plan")` can outline acceptance; assessment requires real evidence. Second call only after new evidence. Persist acceptance scope only via `persist_plan:true`; full Markdown auto-snapshots are **off** by default. Source changes invalidate stale evidence. Local tests are not independent proof of visual, browser, security or hardware acceptance.
6. **Simplify after tests:** remove redundant code or glue; preserve validation, permissions, behavior, error handling and accessibility. Prefer readable code over cryptic one-liners.
7. **Handoff:** explicitly state changed, tests run, failures, outstanding tests, and risks. Use `pilah_evidence` only for real recovery/RCA needs; persistent storage requires opt-in.

Native teamwork/subagents only when independent workstreams benefit and the user opts in. Never spawn teams or change model modes automatically. No extra plugins, background transcript scans, forced compaction, or unverified token-saving claims.

For repetitive native operations, prefer a short, reviewable script with bounded, redacted output over repeated reads/calls. Check effects and permissions first; never bypass approval or sandboxing. Model routing, background sidecars and automatic prompt mutation are not PILAH features.

**Legacy transition:** `a2a_*` MCP tool calls and `A2A_*` environment/data paths remain accepted for existing users. Default public tool inventory lists four `pilah_*` operations only.
