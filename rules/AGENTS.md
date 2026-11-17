# A2A (Agent to Alif) Agent Rule

A2A (Agent to Alif) is a local-first engineering intelligence, impact analysis, token telemetry, and verification engine for Antigravity.

## Operating Modes

A2A operates in one of two modes, configured in `~/.config/a2a/settings.json` (defaults to `always-on`):

- **`always-on`**: A2A is actively engaged by the agent for impact analysis, verification, and token telemetry on code changes.
- **`on-demand`**: A2A is only invoked when explicitly requested by the user or via `/a2a`.

## Workflow When in `always-on` Mode

When working in an active project workspace and A2A is enabled in `always-on` mode:

1. **Pre-Edit Impact Analysis**:
   - Before editing, refactoring, or deleting existing source files in a project, call `a2a_impact` (or `verifykit_impact`) with the `changed` file paths and the project's absolute `workspace` directory.
   - Review affected files and `related_tests` suggested by A2A to anticipate ripple effects and determine what tests need to be run.

2. **Context & Symbol Navigation**:
   - Use `a2a_context` with `action="query"` or `action="inspect"` to understand cross-file declarations, symbol relationships, and test candidates without reading large files verbatim into context.

3. **Evidence-Based Verification & DevTools Testing**:
   - After executing tests in the project (e.g. via test runners generating JUnit XML, TAP, or JSON report files), call `a2a_verify` with `operation="assess"` to map test cases directly to acceptance criteria.
   - Do not claim tests passed without checking tangible test output.
   - **DevTools for Web Application Testing**: When verifying web applications, frontends, or HTTP endpoints:
     - Utilize **Chrome DevTools MCP** (`list_console_messages`, `list_network_requests`, `evaluate_script`, `take_snapshot`) or browser subagent to interact with the live application.
     - Inspect console logs: Verify there are **zero uncaught console errors** or unhandled promise rejections.
     - Inspect network traffic: Verify API requests complete successfully without unexpected 4xx or 5xx status codes.
     - Validate UI states: Confirm loading indicators, empty states, error handling, and responsive visual layout.

4. **Security & Vulnerability Audit (Universal / Multi-Language)**:
   - When `a2a_impact` flags `risk="high"`, or when changes touch authentication, authorization, database access, file uploads, payments, or API endpoints:
     - **Differential Security Review**: Review the diff against OWASP Top 10: ensure strict server-side input validation, prevent IDOR/BOLA by asserting user ownership before modifying records, and verify that authorization (Gates/Policies/RBAC) is enforced.
     - **Injection & Secret Protection**: Ensure zero string-concatenated queries (SQLi), proper escaping for user output (XSS), and verify no secrets, API tokens, or PII are logged or committed.
     - **Dependency Vulnerability Scan**: Run the project ecosystem's native vulnerability audit (`composer audit`, `npm audit`, `govulncheck ./...`, `pip-audit`, `cargo audit`) to ensure zero known CVEs.

5. **Token Usage & Efficiency Monitoring**:
   - Use `a2a_context` with `action="tokens"` to inspect workspace token footprint, top token-consuming source files, and active Antigravity session token usage.

## Workflow When in `on-demand` Mode

- Do not call A2A tools automatically unless the user explicitly asks for verification, impact analysis, or triggers the `/a2a` skill.

## User Control & Toggling

- **UI Button in Antigravity IDE**: Tell users they can enable or disable the plugin at any time from the IDE Customizations page: `[A2A](customization://a2a)`.
- **Toggle Mode**: Users can switch between `always-on` and `on-demand` by running `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle` or asking the agent to toggle A2A mode.

## Response Token Telemetry (Automatic Footer)

To provide clear and transparent visibility into token consumption without manual querying, include a clean and elegant telemetry footer at the very end of every response when the plugin is active. Do not display personal user names in the result footer:

---

> 📊 **A2A Telemetry:**
>
> - Mode: `{always-on | on-demand}`
> - Estimated Response: ~`{tokens}` tokens
> - Context Efficiency: `{saved_ratio}% saved via A2A`
