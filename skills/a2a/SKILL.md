---
name: a2a
description: A2A (Agent to Alif) - Intelligent impact analysis, token usage telemetry, regression memory & test verification. Trigger with /a2a or when the user mentions A2A.
---

# A2A (Agent to Alif) Skill

Use this skill when the user asks to manage A2A, toggle between Always-On and On-Demand modes, run impact analysis, detect token usage/savings, or verify tests on a project.

> **A2A** stands for **Agent to Alif**.

## Chat Commands & Fast Actions

You can control A2A directly through chat commands:

- `/a2a toggle` or `/a2a-toggle`: Toggle between `always-on` and `on-demand`.
- `/a2a always-on` or `/a2a-always-on`: Set operating mode to `always-on`.
- `/a2a on-demand` or `/a2a-on-demand`: Set operating mode to `on-demand`.
- `/a2a compact` or `/a2a-compact`: Toggle A2A Compact token compression (65-80% output token savings).
- `/a2a status` or `/a2a-status`: View active mode, health, and trusted workspaces.
- `/a2a tokens`: Inspect workspace token footprint and Antigravity session consumption.

### Handling Chat Mode Changes

When the user gives any of the mode commands above:
1. Immediately execute the corresponding action via `node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode <always-on|on-demand|toggle>` or status check.
2. Confirm the active mode clearly to the user.

## Mode Control

A2A operates in two modes:
- **`always-on`**: The agent automatically checks `a2a_impact` before editing code, evaluates `a2a_verify` after tests, and appends token telemetry to responses.
- **`on-demand`**: A2A tools are only invoked when explicitly requested by the user.

### Switching Modes

To check current mode:
```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode
```

To switch mode:
```bash
# Switch to always-on
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on

# Switch to on-demand
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand

# Toggle between modes
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle
```

### IDE UI Toggle Button
Enable or disable A2A completely via Antigravity IDE Customizations:
- **[A2A](customization://a2a)**

## Common Operations

### 1. Token Telemetry & Context Savings (`a2a_context action="tokens"`)
Detect source tokens in project, active Antigravity session consumption, and context tokens saved:
```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/path
```

### 2. Pre-Edit Impact Analysis (`a2a_impact`)
Analyze affected files, features, and test candidates before changing code:
- MCP Tool: `a2a_impact` with `workspace` and `changed: ["path/to/file"]`.

### 3. Code Relationships & Symbols (`a2a_context`)
Query symbol declarations and call relations:
- MCP Tool: `a2a_context` with `action="query"`, `query="functionName"`.

### 4. Verification Assessment (`a2a_verify`)
Assess test evidence (JUnit XML, TAP, JSON) against acceptance criteria:
- MCP Tool: `a2a_verify` with `operation="assess"`, `criteria=[{"id": "c1", "artifact": "report.xml", "test_name": "*"}]`.
