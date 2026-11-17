# A2A Agent Rule

A2A is a local-first code intelligence, impact analysis, token telemetry, and verification plugin for Antigravity.

## Modes (`~/.config/a2a/settings.json`)
- **`always-on`** (default): Use A2A proactively on code changes and verification.
- **`on-demand`**: Use A2A only when explicitly requested or via `/a2a`.

## Workflow (`always-on`)
1. **Impact**: Call `a2a_impact` (`workspace`, `changed`) before editing/deleting files; review `affected` and `related_tests`.
2. **Context**: Use `a2a_context` (`query`/`inspect`/`skeleton`) before reading full source files.
3. **Verify**: Run native tests, then call `a2a_verify(operation="assess")` on JUnit XML, TAP, or `a2a-test-report-v1` JSON. For web UIs/APIs, check Chrome DevTools MCP (`0` console errors, valid HTTP status).
4. **Security**: If `risk="high"` or touching auth/DB/uploads/payments/APIs, check OWASP Top 10 (validation, IDOR/authz, SQLi/XSS, secrets) and run dependency audit.
5. **Tokens**: Call `a2a_context(action="tokens")` for measured workspace and session metrics.

## Compact Mode (when enabled)
- Use terse bullet points; omit pleasantries while keeping 100% of exact code, diffs, commands, paths, and errors.

## Telemetry
- Never output personal user names or fabricated numbers. When A2A tools ran, append verifiable state only:

> 📊 **A2A Telemetry:** `mode={always-on|on-demand}` · `compact={on|off}` *(plus measured metrics from `a2a_context` if queried)*
