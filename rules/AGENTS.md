# A2A Senior Engineering Rule

A2A provides local-first code intelligence, token economy, and evidence-based verification for Antigravity.

## Operating Modes (`~/.config/a2a/settings.json`)
- `on-demand` (default): Invoke A2A only when explicitly prompted or via `/a2a`.
- `always-on` (opt-in): Apply adaptive engineering checks only when they offer clear value.

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
   - For subagents that modify executable behavior, require a relevant machine test report when tests are available.
   - Research, analysis, or documentation-only workers should provide sourced findings instead of unnecessary test runs.
   - Coordinators should run `a2a_verify(operation="verify_handoff", worker_name=..., criteria=...)` for testable code handoffs. Reject stale or assertionless reports.

4. **Security & Boundary Gates**:
   - Verify sensitive edits (auth, tokens, DB, uploads, payments) against OWASP Top 10 (anti-IDOR, SQLi, CSRF, XSS, secret leakage). Flag dependency CVE risks proactively.

## Output Discipline
- Preserve exact code, paths, uncertainties, and evidence status; avoid repeating tool responses.
- Do not append a token/telemetry footer by default. Show token estimates only when explicitly requested.
- Never claim task-level token savings without a controlled A/B measurement.
