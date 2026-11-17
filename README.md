# A2A (Agent to Alif)

**Local-first engineering intelligence, impact analysis, token telemetry & verification plugin for Google Antigravity.**

> **A2A** stands for **Agent to Alif** — providing intelligent local-first code analysis, dependency mapping, token telemetry, and evidence-based test verification.

A2A empowers Antigravity agents with deterministic dependency mapping, regression memory, live token telemetry, and evidence-based test verification.

## Features

- **Automatic Antigravity Workspace Integration:** Seamlessly discovers and trusts projects opened in Antigravity IDE without double-confirming or manual allowlisting.
- **Dual Operating Modes:** Toggle between `always-on` (proactive pre-edit impact analysis and post-test verification) and `on-demand` (invoked only when requested).
- **Token Telemetry & Context Savings:** Tracks active conversation token consumption and detects how many thousands/millions of context tokens A2A saves by serving compact relation graphs instead of dumping raw source code into LLM prompts.
- **Evidence-Based Verification:** Evaluates machine-readable test reports (JUnit XML, TAP, JSON) against acceptance criteria before declaring tasks complete.
- **Regression Knowledge:** Scopes incident history, hypotheses, and revision snapshots locally to your machine using zero-dependency SQLite.

## Quick Installation

### Method 1: Easiest — Direct via Chat Command (Recommended)
Simply type this command in your Antigravity chat:
```text
/plugin install alifakbxr/a2a
```
*(Or specify the full GitHub URL: `/plugin install https://github.com/alifakbxr/a2a`)*

### Method 2: Via Antigravity CLI
In your terminal, execute:
```bash
agy plugin install alifakbxr/a2a
```

### Method 3: Direct Git Clone
Clone directly into your Antigravity plugins directory:
```bash
git clone https://github.com/alifakbxr/a2a.git ~/.gemini/config/plugins/a2a
```
Antigravity automatically discovers and activates the plugin instantly.

## Setup & Configuration

### Direct Chat Commands (Fastest)

You can manage and toggle A2A directly in your Antigravity chat:

| Command | Action |
|---|---|
| `/a2a-toggle` *(or `/a2a toggle`)* | Quickly switch between **Always-On** and **On-Demand** |
| `/a2a-always-on` *(or `/a2a always-on`)* | Enable **Always-On** (proactive impact check & verification) |
| `/a2a-on-demand` *(or `/a2a on-demand`)* | Switch to **On-Demand** (tools run only when requested) |
| `/a2a-compact` *(or `/a2a compact`)* | Toggle **Compact Mode** (65-80% output token reduction, zero fluff) |
| `/a2a-compact` *(or `/a2a compact`)* | Toggle **Compact Mode** (65-80% output token reduction, zero fluff) |
| `/a2a-status` *(or `/a2a status`)* | Show current mode, health diagnostics & trusted workspaces |
| `/a2a tokens` | Show token consumption and context savings |

### CLI Commands (Terminal)

### Method 1: Easiest — Direct via Chat Command (Recommended)
Simply type this command in your Antigravity chat:
```text
/plugin install alifakbxr/a2a
```
*(Or specify the full GitHub URL: `/plugin install https://github.com/alifakbxr/a2a`)*

### Method 2: Via Antigravity CLI
In your terminal, execute:
```bash
agy plugin install alifakbxr/a2a
```

### Method 3: Direct Git Clone
Clone directly into your Antigravity plugins directory:
```bash
git clone https://github.com/alifakbxr/a2a.git ~/.gemini/config/plugins/a2a
```
Antigravity automatically discovers and activates the plugin instantly.

## Setup & Configuration

### Direct Chat Commands (Fastest)

You can manage and toggle A2A directly in your Antigravity chat:

| Command | Action |
|---|---|
| `/a2a-toggle` *(or `/a2a toggle`)* | Quickly switch between **Always-On** and **On-Demand** |
| `/a2a-always-on` *(or `/a2a always-on`)* | Enable **Always-On** (proactive impact check & verification) |
| `/a2a-on-demand` *(or `/a2a on-demand`)* | Switch to **On-Demand** (tools run only when requested) |
| `/a2a-compact` *(or `/a2a compact`)* | Toggle **Compact Mode** (65-80% output token reduction, zero fluff) |
| `/a2a-compact` *(or `/a2a compact`)* | Toggle **Compact Mode** (65-80% output token reduction, zero fluff) |
| `/a2a-status` *(or `/a2a status`)* | Show current mode, health diagnostics & trusted workspaces |
| `/a2a tokens` | Show token consumption and context savings |

### CLI Commands (Terminal)

1. Check runtime and permissions:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor
   ```

2. Switch operating mode:
   ```bash
   # Switch to Always-On (default)
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on

   # Switch to On-Demand
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand

   # Toggle mode
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle
   ```

3. Manage via Antigravity IDE Customizations:
   - Navigate to: **[A2A](customization://a2a)**

## MCP Tools

- `a2a_context`: Read-only source-backed project index, symbol relationships, capabilities, freshness, and token metrics.
- `a2a_impact`: Bounded provenance-aware static graph impact analysis with affected token calculations.
- `a2a_verify`: Native test planning and test report evidence assessment (JUnit XML, TAP, JSON).
- `a2a_evidence`: Workspace-scoped evidence runs, regression incident tracking, and hypotheses.

*(Legacy `verifykit_*` tool names remain available as backward-compatible aliases).*

## Token Telemetry CLI

To inspect a project's token footprint and Antigravity session consumption:
```bash
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs tokens /absolute/path/to/project
```

## Running Tests

```bash
cd ~/.gemini/config/plugins/a2a
npm test
agy plugin validate . --strict
```
