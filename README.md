# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — a small, native-first engineering layer for Google Antigravity.

PILAH helps coding agents find relevant cross-file context, reason about change impact, plan verification and track evidence **only when native tools cannot efficiently resolve the uncertainty**. PILAH does **not** edit project files, run shell commands, launch agents, replace Antigravity, or guarantee token savings.

[**CI:** view the repository's Actions tab · [Documentation](docs/README.md) · [MIT License](LICENSE)

> **Source status — 24 November 2026:** The plugin is named **PILAH** (manifest `2.1.0`); the GitHub repository URL is still the existing repository. The package manifest uses `@aliip/pilah`, but **publication is not verified**. The source-level CI passed on the latest main push (3/3 OS jobs on Node 24). Real installed Antigravity adoption, independent STOCKROOM F01–F18 runtime acceptance and matched token benchmarks are **not yet verified**. See [current status](BUILD_STATUS.md) and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).

## What it provides

| MCP tool | Use it for | Does not do |
| --- | --- | --- |
| `pilah_context` | Targeted symbol, source and cross-file relationship queries | Automatically read an entire repository for each prompt |
| `pilah_impact` | Scoped change-impact and candidate tests | Prove that every dependency or behavior was covered |
| `pilah_verify` | Risk-aware acceptance planning and named test-evidence assessment | Run or independently certify actual tests |
| `pilah_evidence` | Source-bound incidents, optional checkpoints and recovery guidance | Replay unknown tools or grant new permissions |

Only `pilah_context` is eager by default; the other tools remain lazy. **A clear task should trigger zero PILAH calls.** One precise call is preferable to an automatic chain. For difficult bugs: reproduce → test a hypothesis → make the smallest complete fix → run relevant tests → report what remains unverified. See the [PILAH skill](skills/pilah/SKILL.md) and [engineering method](docs/ENGINEERING_METHOD.md).

## Requirements and source setup

- Node.js **22.13.0 or newer** with built-in `node:sqlite`; no third-party npm runtime dependencies.
- Google Antigravity with support for the plugin/MCP features used here.
- Permission to inspect the intended workspace; protected roots, sensitive files and revoked workspaces remain denied.

```sh
git clone <repository-clone-url>
cd <checkout-directory>
node --version
npm run check
node scripts/check-release.mjs
node scripts/pilah.mjs doctor
```

Install/register this **source checkout** using the native plugin manager supported by your Antigravity version. If the `agy` CLI is available, validate it with `agy plugin validate --strict .` and inspect `agy plugin list`. These are **steps for your machine**, not claims of a completed live installation test. The bundle includes `plugin.json`, `mcp_config.json`, `hooks.json`, `rules/AGENTS.md` and `skills/pilah/SKILL.md`.

Do not rely on the unpublished `@aliip/pilah` package identifier as an installation command. Avoid registering duplicate plugin instances unless explicitly intended.

## CLI from a checkout

The source entrypoint remains `scripts/pilah.mjs` for backward compatibility, and the package manifest declares `pilah` as its preferred binary name. The following commands are **CLI subcommands**, not guaranteed Antigravity slash commands:

```sh
node scripts/pilah.mjs help
node scripts/pilah.mjs doctor
node scripts/pilah.mjs mode on-demand
node scripts/pilah.mjs mode always-on      # optional, explicit opt-in
node scripts/pilah.mjs toggle
node scripts/pilah.mjs compact on
node scripts/pilah.mjs autotrust active-only
node scripts/pilah.mjs allow /absolute/path/to/project
node scripts/pilah.mjs revoke /absolute/path/to/project
node scripts/pilah.mjs inspect /absolute/path/to/project
node scripts/pilah.mjs impact /absolute/path/to/project src/auth.js
node scripts/pilah.mjs tokens --limit 5 --json
node scripts/pilah.mjs route --profile economy --task cross-file --uncertain
```

**Defaults:** On-Demand and Compact. Always-On remains opt-in and does not require a tool call for simple tasks. Context Guardian is separate, also opt-in, and does not compact conversations automatically. `tokens` distinguishes observed metadata and estimates from provider-reported usage; **model token savings cannot be inferred from a smaller response or fewer MCP calls**.

## Verification example

Send the following arguments to `pilah_verify` with `operation="plan"`:

```json
{
  "workspace": "/absolute/path/to/project",
  "operation": "plan",
  "criteria": [{
    "id": "duplicate-checkin",
    "given": "A guest already checked in",
    "when": "The QR code is scanned again",
    "then": "No second print job is produced",
    "evidence_type": "hardware",
    "negative": true
  }]
}
```

Planning produces `not_tested` until evidence exists. A passing build or a local test report is **not** proof of real printer hardware, UI state, security, browser behavior or independent release acceptance. Run the actual tests with native Antigravity tools and report the names of the tests that ran. See [MCP contracts](docs/CONTRACTS.md), [security](docs/SECURITY.md) and [independent acceptance](docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md).

## Migrating from PILAH

- New default tool names: `pilah_context`, `pilah_impact`, `pilah_verify`, `pilah_evidence`.
- Old `PILAH_*` and `verifykit_*` MCP calls remain callable compatibility aliases; `the corresponding legacy configuration setting=1` exposes aliases in tool listing only when explicitly requested.
- The `pilah` executable alias, `PILAH_*` configuration variables, and legacy local data directories are intentionally **retained** to protect existing installations. Do not delete their data or migrate them by renaming folders blindly.
- The GitHub repository name has **not** been changed to `pilah`; installation links use the real source location until an actual repository rename.

## Testing, CI and release

Routine CI now uses **1 full-suite PR job** on Ubuntu/Node 24, **3 jobs on main** (Ubuntu/macOS/Windows, Node 24), with the **full 9-job OS × Node 22/24/26.13.1 matrix** available by manually dispatching the workflow. A green repository CI run is not a live Antigravity acceptance or publication authorization. No automatic release or new package publication was performed.

- [Documentation index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Compatibility](docs/COMPATIBILITY.md)
- [CI and efficiency methodology](docs/CI_EFFICIENCY.md) · [Release process](docs/RELEASE.md)
- [Status](BUILD_STATUS.md) · [Outstanding independent validation](docs/MAIN_VALIDATION_BACKLOG.md)

[MIT](LICENSE) © 2026 Alif Akbar and contributors.
