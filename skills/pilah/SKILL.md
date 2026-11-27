---
name: pilah
description: Native-first code intelligence for cross-file dependencies, change impact, and evidence-scoped verification. Not for routine single-file edits.
---

# PILAH — Project Intelligence, Logic, Analysis & Handoffs

Antigravity executes and chooses native tools. PILAH is optional, read-first code intelligence, not a second agent.

## 0 calls → 1 scoped call → more only with new evidence

1. **0 calls:** trivial UI text, isolated edits, already-understood bugs. Inspect existing project code and edit with native tools; don't invoke PILAH just because the skill was mentioned.
2. **Scope:** before risky code, identify callers, affected tests, config, permission boundaries and available platform primitives. Prefer the smallest complete change.
3. **1 call on cross-file uncertainty:** use eager `pilah_context` only if available and helpful (query a specific symbol, `workspace="<trusted project>"`, `limit=5`). Antigravity registers eager tools as `mcp_<server>_pilah_context`, commonly `mcp_pilah_pilah_pilah_context`; discover the actual server from /mcp, never assume names. For advanced impact, discover lazy `pilah_impact` schema at the MCP path listed by Antigravity, then use `call_mcp_tool` with its exact `ServerName`, `ToolName` and `Arguments`. Do not substitute a shell command or an invented direct tool call for proof of MCP use. If unavailable, proceed natively and disclose it.
   **If a real impact result is truncated and omitted files matter:** request only the needed next `affected_offset` (25/page) or `related_tests_offset` (10/page), with `expected_revision` copied from the previous response. Stop when `next_offset` is null. Never combine pages across revisions or treat static candidates as passing tests.
4. **Debug:** reproduce the failure; form a falsifiable hypothesis. Apply 5 Whys only to repeated, risky or unclear defects, not trivial work.
5. **Verification:** use native tests and real negative cases. `pilah_verify(operation="plan")` can propose Given/When/Then; an unexecuted plan stays `not_tested`. Only persist acceptance with `persist_plan:true`; Markdown auto-snapshots are **off** by default. Local PASS is not independent browser, security or production proof.
6. **Finish:** simplify after testing without weakening permissions or error handling. Second call only after new evidence reveals a different unresolved question.
7. **Handoff:** report code changes, tests actually run, failures and remaining risks. `pilah_evidence` is opt-in for meaningful recovery, not routine record keeping.

Use native Teamwork/subagents only with explicit permission and independent file ownership. No extra plugins, background scans, automatic model routing, forced compaction or unverified token savings. Check actual tool traces when assessing PILAH adoption: reading this skill is **not** an MCP invocation.

**Compatibility:** legacy tool aliases and data remain supported. Public discovery exposes four PILAH operations.
