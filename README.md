# A2A (Agent to Alif)

**Local-first engineering intelligence, impact analysis, token telemetry & verification plugin for Google Antigravity.**

> **A2A** stands for **Agent to Alif** — providing intelligent local-first code analysis, dependency mapping, token telemetry, and evidence-based test verification.

A2A empowers Antigravity agents with deterministic dependency mapping, regression memory, live token telemetry, and evidence-based test verification.

## Features

- **Workspace Trust & Safety:** Uses Antigravity's built-in user trust lists (`state.vscdb` Workspace Trust + CLI `trustedWorkspaces`) plus explicit `a2a allow` approvals, while enforcing a protected-roots denylist (`~`, `/`, `~/Documents`, `~/Downloads`, `~/Desktop`, `~/Music`, `~/Pictures`, `~/Videos`, `~/.config`, `~/.gemini`, `~/.ssh`, `~/.aws`, `~/.gnupg`, `tmpdir`) and configurable `autoTrust` (`antigravity-trust` | `active-only` | `project-markers` | `off`).
- **Dual Operating Modes:** Toggle between `always-on` (proactive pre-edit impact analysis and post-test verification) and `on-demand` (invoked only when requested).
- **Antigravity Hooks (`hooks.json`):** Captures active `conversationId` and `transcriptPath` via `SessionStart`/`PreInvocation` for accurate session telemetry without injecting telemetry spam.
- **Measured Token Telemetry & Lexer Skeletonizer:** Tracks real scoped context savings in SQLite (`raw_scope_tokens` vs `response_tokens`), accurate `PLANNER_RESPONSE`/`USER_INPUT` session metrics, and comment-free code skeletons (`a2a_context action="skeleton"`) using a single-pass state-machine lexer.
- **Evidence-Based Verification:** Evaluates machine-readable test reports (JUnit XML, TAP, `a2a-test-report-v1` JSON) against acceptance criteria before declaring tasks complete.
- **Regression Knowledge:** Scopes incident history, hypotheses, and revision snapshots locally in `a2a.sqlite` using zero-dependency `node:sqlite`.

## Quick Installation

### Method 1: One-Line Auto Installer (Fastest & Universal)
Run this single command in your terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/alifakbxr/a2a/main/install.sh | bash
```
*Automatically clones into `~/.gemini/config/plugins/a2a`, checks dependencies, and validates Antigravity discovery.*

### Method 2: Direct via Antigravity Chat Command
Inside any Antigravity conversation, simply type:
```text
/plugin install alifakbxr/a2a
```
*(Or specify the full GitHub URL: `/plugin install https://github.com/alifakbxr/a2a`)*

### Method 3: Via Antigravity CLI
```bash
agy plugin install alifakbxr/a2a
```

### Method 4: Direct Git Clone
```bash
git clone https://github.com/alifakbxr/a2a.git ~/.gemini/config/plugins/a2a
```
Antigravity automatically discovers and activates the plugin.

## Setup & Configuration

### Direct Chat Commands

| Command | Action |
|---|---|
| `/a2a-toggle` *(or `/a2a toggle`)* | Quickly switch between **Always-On** and **On-Demand** |
| `/a2a-always-on` *(or `/a2a always-on`)* | Enable **Always-On** (proactive impact check & verification) |
| `/a2a-on-demand` *(or `/a2a on-demand`)* | Switch to **On-Demand** (tools run only when requested) |
| `/a2a-compact` *(or `/a2a compact`)* | Toggle **Compact Mode** (terse bullet output, zero filler, measured skeletonization) |
| `/a2a-status` *(or `/a2a status`)* | Show current mode, compact mode, auto-trust, session telemetry & trusted workspaces |
| `/a2a tokens` | Show workspace token footprint and Antigravity session consumption |

### CLI Commands (Terminal)

1. Check runtime and permissions:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor
   ```

2. Switch operating mode, compact mode, or auto-trust policy:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact toggle
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs autotrust antigravity-trust
   ```

3. Hot-reload the live MCP server in Antigravity:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs refresh
   ```

4. Manage via Antigravity IDE Customizations:
   - Navigate to: **[A2A](customization://a2a)**

## MCP Tools & Resources

- `a2a_context`: Read-only source-backed project index, symbol relationships, `skeleton` preview, freshness, and measured token metrics.
- `a2a_impact`: Bounded provenance-aware static graph impact analysis with affected token calculations.
- `a2a_verify`: Native test planning and test report evidence assessment (JUnit XML, TAP, `a2a-test-report-v1` JSON).
- `a2a_evidence`: Workspace-scoped evidence runs, regression incident tracking, and hypotheses.
- MCP Resources: `a2a://status`, `a2a://tokens/session`, `a2a://workspace/summary`.

*(Legacy `verifykit_*` tool names remain invokable for backward compatibility; set `A2A_LEGACY_TOOL_ALIASES=1` to also expose them in `tools/list`).*

## Token Telemetry & Skeletonizer CLI

```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/path/to/project
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs skeleton /absolute/path/to/project src/index.js
```

## Track Installs & Analytics

To see live install counts, unique installers, and repository traffic directly from GitHub:
```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs stats
```

## Running Tests

```bash
cd ~/.gemini/config/plugins/a2a
npm test
node scripts/check-release.mjs
agy plugin validate . --strict
```
