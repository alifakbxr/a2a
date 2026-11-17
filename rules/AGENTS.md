# A2A Senior Engineering Rule

A2A provides local-first code intelligence, token economy, and evidence-based verification for Antigravity.

## Operating Modes (`~/.config/a2a/settings.json`)
- `always-on` (default): Autonomously enforce senior engineering best practices.
- `on-demand`: Invoke A2A only when explicitly prompted or via `/a2a`.

## Senior Engineering Protocols (Always-On)

1. **Token ROI & Adaptive Triggering**:
   - **Skip A2A tools** for localized tasks: single leaf file edits, documentation (`.md`), comments, styles, typo fixes, or isolated test files. Perform direct edits in 1 turn.
   - **Invoke `a2a_impact`** for cross-module tasks: edits touching shared utilities, models, types, database queries, authentication, or $\ge 2$ modules.
   - **Invoke `a2a_context(action="skeleton")`** when exploring unfamiliar files to avoid dumping raw boilerplate into context.

2. **Evidence-Based Verification (The Iron Law)**:
   - For logic and functional changes, run native tests with machine reporters (`--reporter=tap`, `--log-junit=report.xml`, or JSON).
   - Evaluate completed reports via `a2a_verify(operation="assess")` or `a2a_verify(operation="verify_handoff")`.
   - Never claim completion on unverified assertions.

3. **Subagent & Teamwork Verification Gate**:
   - When running `/teamwork`, `swarm`, or subagents, every worker MUST generate a machine test report before finishing.
   - Coordinators MUST run `a2a_verify(operation="verify_handoff", worker_name=...)` before accepting deliverables. Reject stale or assertionless reports.

4. **Security & Boundary Gates**:
   - Verify sensitive edits (auth, tokens, DB, uploads, payments) against OWASP Top 10 (anti-IDOR, SQLi, CSRF, XSS, secret leakage). Flag dependency CVE risks proactively.

## Compact Output & Telemetry
- Use terse, high-density bullets; preserve exact code, paths, and diffs.
- Keep footer natural and concise:
> **A2A:** Always-On · Context: {context_tokens} ({cache_hit}% cached)
