---
name: a2a
description: A2A - Intelligent impact analysis, code skeletonizer, token usage telemetry, regression memory & test verification. Trigger with /a2a or when the user mentions A2A.
---

# A2A Skill

Use this skill when the user asks to manage A2A, toggle between Always-On and On-Demand modes, enable/disable Compact mode, run impact analysis, skeletonize files, detect token usage/savings, refresh the MCP server, or verify tests on a project.

## Chat Commands & Fast Actions

You can control A2A directly through chat commands:

- `/a2a toggle` or `/a2a-toggle`: Toggle between `always-on` and `on-demand`.
- `/a2a always-on` or `/a2a-always-on`: Set operating mode to `always-on`.
- `/a2a on-demand` or `/a2a-on-demand`: Set operating mode to `on-demand`.
- `/a2a compact [on|off|toggle|status]` or `/a2a-compact`: Control A2A Compact token compression.
- `/a2a status` or `/a2a-status`: View active mode, compact mode, auto-trust policy, health, and trusted workspaces.
- `/a2a tokens`: Inspect workspace token footprint and Antigravity session consumption.
- `/a2a skeleton <file...>`: Produce comment-stripped code skeletons with measured token savings.
- `/a2a refresh`: Hot-reload the `a2a_a2a` MCP server via the Antigravity Language Server RPC.

### Handling Chat Mode & CLI Commands

When the user gives any of the commands above:
1. Execute the corresponding valid CLI command:
   - Mode: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode <always-on|on-demand>` or `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle`
   - Compact: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact <on|off|toggle|status>`
   - Status / Doctor: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor`
   - Tokens: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/path [--conv <id>]`
   - Skeleton: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs skeleton /absolute/path <relative-file...>`
   - Refresh MCP: `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs refresh`
2. Confirm the active state or measured result clearly without displaying personal user names.

## Mode Control

A2A operates in two modes:
- **`always-on`**: The agent automatically checks `a2a_impact` before editing code, uses `a2a_context`, evaluates `a2a_verify` after tests, and reports verifiable mode/measured telemetry.
- **`on-demand`**: A2A tools are only invoked when explicitly requested by the user.

### IDE UI Toggle Button
Enable or disable A2A completely via Antigravity IDE Customizations:
- **[A2A](customization://a2a)**

## Common Operations

### 1. Token Telemetry & Context Savings (`a2a_context action="tokens"`)
Detect source tokens in project, active Antigravity session consumption, and measured context savings:
```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/path
```

### 2. Code Skeletonizer (`a2a_context action="skeleton"`)
Strip comments cleanly using A2A's lexer-safe skeletonizer while preserving strings, templates, and regexes:
- MCP Tool: `a2a_context` with `action="skeleton"`, `workspace`, and `file` or `files`.

### 3. Pre-Edit Impact Analysis (`a2a_impact`)
Analyze affected files, features, and test candidates before changing code:
- MCP Tool: `a2a_impact` with `workspace` and `changed: ["path/to/file"]`.
- When `risk="high"` or edits touch auth, DB, file uploads, payments, or APIs: audit OWASP Top 10 (input validation, ownership/IDOR, authz, SQLi/XSS, secret hygiene) and run the project's dependency vulnerability scan (`npm audit`, `composer audit`, `govulncheck ./...`, `pip-audit`, `cargo audit`).

### 4. Code Relationships & Symbols (`a2a_context`)
Query symbol declarations and call relations:
- MCP Tool: `a2a_context` with `action="query"`, `query="functionName"`.

### 5. Verification Assessment & DevTools (`a2a_verify`)
Assess test evidence (JUnit XML, TAP, `a2a-test-report-v1` JSON) against acceptance criteria:
- MCP Tool: `a2a_verify` with `operation="assess"`, `criteria=[{"id": "c1", "artifact": "report.xml", "test_name": "*"}]`.
- For web/HTTP applications, use Chrome DevTools MCP (`list_console_messages`, `list_network_requests`, `evaluate_script`, `take_snapshot`) to verify zero uncaught console errors and expected HTTP responses.

### 6. Large Scope & Antigravity /teamwork Handoff
When `a2a_impact` flags `teamwork_advisory.large_scope=true` or when a task touches multiple architectural layers:
- Advise the user to execute `/teamwork` for parallel multi-agent execution.
- Pass A2A's pre-computed affected files, dependencies, and test targets into the teamwork prompt so explorers and workers bypass redundant token-heavy file scans.
