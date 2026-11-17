# A2A Agent Rule

A2A is a local-first code intelligence, impact analysis, token telemetry, and verification plugin for Antigravity.

## Modes (`~/.config/a2a/settings.json`)
- **`always-on`** (default): Autonomously execute A2A best practices across every turn.
- **`on-demand`**: Use A2A only when explicitly requested or via `/a2a`.

## Always-On Best Practice Protocols
When `always-on` is active, adhere to the following senior engineering workflow:

1. **Pre-Edit Impact Protocol**:
   - Always run `a2a_impact(workspace, changed=[...])` before editing or deleting files.
   - Inspect `affected` downstream modules and `related_tests`. Never perform unmapped changes across module boundaries.

2. **Context Skeletonization (Token Economy)**:
   - Use `a2a_context(action="skeleton", file=...)` for exploring multi-file relationships or interface contracts.
   - Read full source files only when directly authoring implementation bodies inside them. Preserve context budget for reasoning.

3. **Evidence-Based Verification (The Iron Law)**:
   - Run tests with machine-readable reporters:
     - Node/TS: `npm test -- --reporter=tap` (or JUnit)
     - Go: `go test -v ./...`
     - Python: `pytest --junitxml=report.xml`
     - PHP: `php artisan test --log-junit=report.xml`
   - Immediately call `a2a_verify(operation="assess")` or `a2a_verify(operation="verify_handoff")` on the generated report.
   - Never claim completion or report a task as passed without verifiable machine evidence.

4. **Web Frontend & UI Verification**:
   - For web UI or API endpoint changes, verify live via Chrome DevTools MCP.
   - Assert 0 uncaught console errors and valid `2xx` HTTP status codes.

5. **Universal Security Gates**:
   - When modifying sensitive boundaries (auth, credentials, tokens, DB queries, payments, or file uploads), verify against OWASP Top 10 (anti-IDOR, SQLi, CSRF, XSS, secrets leakage).
   - Flag any dependency CVE risks proactively.

6. **Large Scope & Teamwork Delegation Gate**:
   - When a user request or `a2a_impact` indicates a large task (e.g. >= 6 affected files, cross-stack refactoring, multi-module architectural changes, or high ripple risk):
   - Proactively suggest running Antigravity's native `/teamwork` command for parallel multi-agent execution (explorers, workers, reviewers, challengers).
   - Supply the Teamwork squad with A2A's pre-computed impact graph and skeleton references so subagents avoid blind token-heavy scans.

7. **Subagent & Teamwork Verification Gate**:
   - Every subagent, worker, or swarm task MUST produce verifiable machine test evidence (JUnit XML, TAP, or JSON report) before concluding.
   - The coordinator / parent agent MUST run `a2a_verify(operation="verify_handoff")` before accepting or merging subagent deliverables.
   - The Freshness Rule: test reports generated before file edits are strictly rejected as `stale`. Subagents must re-run tests on the final code diff.
   - Zero Unverified Claims: any subagent message claiming "all tests pass" without an artifact is flagged as `unverified` and sent back for test execution.

## Compact Mode (when enabled)
- Use terse bullet points; omit pleasantries while keeping 100% of exact code, diffs, commands, paths, and errors.

## Telemetry
- Never output personal user names or fabricated numbers. Do not use emoji icons or robotic key-value dumps.
- Keep the footer natural, concise, and focused on essential value:

> **A2A:** Always-On (all safeguards active) · Compact · Context: {context_tokens} ({cache_hit}% cached)
