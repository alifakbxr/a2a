# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — lightweight, native-first code intelligence for Google Antigravity.

PILAH helps agents understand project symbols, inspect change impact, and organize verification test plans when native tools face ambiguity. PILAH never modifies code directly, runs arbitrary commands, or takes unguided actions.

[Documentation Index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [MIT License](LICENSE)

> **Status (v1.0.4):** Active development on branch `main` at [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Source CI passed across 3/3 platforms (Ubuntu, macOS, Windows on Node 24). Formal external acceptance across scenarios F01–F18 remains unverified and independent. See [Build Status](BUILD_STATUS.md) and [Validation Backlog](docs/MAIN_VALIDATION_BACKLOG.md).

---

## Quick Install & Quick Start ⚡

### 🚀 1-Line Quick Install

**Via npm (Global CLI):**
```bash
npm install -g @aliip/pilah
```

**Via Antigravity CLI:**
```bash
agy plugin install @aliip/pilah
# or directly from GitHub
agy plugin install github:alifakbxr/pilah
```

**Via Antigravity UI:**
Open **Settings** (`Ctrl+,`) → **Customizations** → **Add Plugin** → Enter `@aliip/pilah`.

### ⏱️ 30-Second Quick Start

1. **Authorize your project workspace:**
   ```bash
   node scripts/pilah.mjs allow /path/to/project
   # or with global npm: pilah allow /path/to/project
   ```

2. **Check environment readiness:**
   ```bash
   node scripts/pilah.mjs doctor
   # or with global npm: pilah doctor
   ```

3. **Use directly:**
   Your Antigravity agent will now automatically discover the eager `pilah_context` tool and related analysis tools when assisting with multi-file dependencies.

---

## Installation Guide

### 1. Install via npm (Global CLI & Agents)

Install globally via npm to make the `pilah` CLI tool available everywhere on your system:

```bash
npm install -g @aliip/pilah
```

Verify the installation:
```bash
pilah doctor
```

You can also run one-off commands without permanent installation using `npx`:
```bash
npx @aliip/pilah doctor
```

---

### 2. For Non-Developers (Standard Antigravity UI)

Install directly through the Antigravity user interface without building from source:

1. **Open Google Antigravity**.
2. Go to **Settings** (`Ctrl + ,` or the gear icon) and select the **Customizations** or **Plugins** tab.
3. Click **Add Plugin** / **Install from Marketplace**.
4. Enter the package `@aliip/pilah` or the GitHub repository URL:
   ```text
   https://github.com/alifakbxr/pilah
   ```
5. Click **Install**. The PILAH plugin and MCP server `pilah` will activate automatically in your workspace.

---

### 3. For Developers & Contributors (Manual Setup & CLI)

For contributors developing features, running tests, or inspecting source code:

#### Prerequisites
- **Node.js** `>=22.13.0` (uses built-in `node:sqlite`, zero external runtime dependencies).
- **Google Antigravity** or the `agy` CLI.

#### Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/alifakbxr/pilah.git
   cd pilah
   ```
2. Run diagnostic checks and tests:
   ```bash
   node scripts/pilah.mjs doctor
   node scripts/check-release.mjs
   npm test
   ```
3. Connect to Antigravity:
   - Using the `agy` CLI:
     ```bash
     agy plugin install .
     agy plugin validate --strict .
     ```
   - Or install into the local configuration directory:
     ```bash
     mkdir -p ~/.gemini/config/plugins/pilah
     cp -r . ~/.gemini/config/plugins/pilah/
     ```
4. Run host validation:
   ```bash
   node scripts/pilah.mjs host-check
   ```

---

## MCP Tools

PILAH provides 4 local stdio MCP tools:

| Tool | Primary Purpose | Scope Boundary |
| --- | --- | --- |
| `pilah_context` | Query symbols, file relationships, and directional dependencies | Inspects relevant files only (never dumps entire repository) |
| `pilah_impact` | Static change-impact analysis and candidate test suggestions | Computes static references, not dynamic execution |
| `pilah_verify` | Structured Given/When/Then verification test planning | Produces test plans, does not execute tests automatically |
| `pilah_evidence` | Evidence recording, incident checkpoints, and recovery notes | Does not falsify reports or elevate permissions |

When `pilah_impact` returns `result_truncated: true`, its `pagination` fields enable revision-pinned follow-up pages (25 affected files and 10 related tests per call). See [tool contracts](docs/CONTRACTS.md). This does not establish complete runtime coverage or measured token savings.

For full input/output specifications, see [MCP Contracts](docs/CONTRACTS.md).

---

## CLI Commands

The PILAH CLI is available via `scripts/pilah.mjs`:

```bash
# Help and Diagnostics
node scripts/pilah.mjs help
node scripts/pilah.mjs doctor

# Operational Modes
node scripts/pilah.mjs mode on-demand
node scripts/pilah.mjs mode always-on
node scripts/pilah.mjs toggle
node scripts/pilah.mjs compact on
node scripts/pilah.mjs autotrust active-only

# Workspace Authorization
node scripts/pilah.mjs allow /path/to/project
node scripts/pilah.mjs revoke /path/to/project

# Code & Impact Analysis
node scripts/pilah.mjs inspect /path/to/project
node scripts/pilah.mjs impact /path/to/project src/index.js

# Token & Session Diagnostics
node scripts/pilah.mjs tokens --limit 5 --json
```

---

## Verification Test Plan Example

Pass the following payload to `pilah_verify` with operation `plan`:

```json
{
  "workspace": "/path/to/project",
  "operation": "plan",
  "criteria": [
    {
      "id": "prevent-duplicate-order",
      "given": "An order is already finalized",
      "when": "A duplicate payment request is received",
      "then": "Reject transaction with HTTP 409 and log idempotency conflict",
      "evidence_type": "integration",
      "negative": true
    }
  ]
}
```

A generated plan remains `not_tested` until real machine evidence is recorded via `pilah_evidence`. Actual tests are executed using your project's native test runner (e.g., Vitest, Jest, PHPUnit, or Pytest).

---

## Complete Documentation

- [Documentation Index](docs/README.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Engineering Method & Principles](docs/ENGINEERING_METHOD.md)
- [MCP Contracts & Tool Schemas](docs/CONTRACTS.md)
- [Workspace Security & Privacy](docs/SECURITY.md)
- [Runtime & System Compatibility](docs/COMPATIBILITY.md)
- [CI Efficiency & Runner Allocation](docs/CI_EFFICIENCY.md)
- [Release Process & Automation Gate](docs/RELEASE.md)
- [Host Validation](docs/HOST_VALIDATION.md)
- [Release Authorization](docs/RELEASE_AUTHORIZATION.md)
- [Validation Backlog](docs/MAIN_VALIDATION_BACKLOG.md)

---

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Support](SUPPORT.md)

## License

[MIT License](LICENSE) © 2026 Alif Akbar and contributors.
