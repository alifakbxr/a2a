# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — a small, native-first engineering layer for Google Antigravity.

PILAH helps coding agents find relevant cross-file context, reason about change impact, plan verification and track evidence **only when native tools cannot efficiently resolve the uncertainty**. PILAH does **not** edit project files, run shell commands, launch agents, replace Antigravity, or guarantee token savings.

**CI:** view the repository's Actions tab · [Documentation](docs/README.md) · [MIT License](LICENSE)

> **Source status — 24 November 2026:** The plugin is named **PILAH** (manifest `1.0.1`); the canonical repository is [alifakbxr/pilah](https://github.com/alifakbxr/pilah). The package manifest uses `@aliip/pilah`, but **publication is not verified**. The source-level CI passed on the latest main push (3/3 OS jobs on Node 24). Real installed Antigravity adoption, independent Acceptance F01–F18 runtime validation and matched token benchmarks are **not yet verified**. See [current status](BUILD_STATUS.md) and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).

## What it provides

| MCP tool | Use it for | Does not do |
| --- | --- | --- |
| `pilah_context` | Targeted symbol, source and cross-file relationship queries | Automatically read an entire repository for each prompt |
| `pilah_impact` | Scoped change-impact and candidate tests | Prove that every dependency or behavior was covered |
| `pilah_verify` | Risk-aware acceptance planning and named test-evidence assessment | Run or independently certify actual tests |
| `pilah_evidence` | Source-bound incidents, optional checkpoints and recovery guidance | Replay unknown tools or grant new permissions |

The scanner resolves basic local Python imports, configured Composer PSR-4 PHP class imports, and explicit JS/TS path aliases only when exact target files exist. Runtime framework dispatch remains unknown. Only `pilah_context` is eager by default; the other tools remain lazy. **A clear task should trigger zero PILAH calls.** One precise call is preferable to an automatic chain. For difficult bugs: reproduce → test a hypothesis → make the smallest complete fix → run relevant tests → report what remains unverified. See the [PILAH skill](skills/pilah/SKILL.md) and [engineering method](docs/ENGINEERING_METHOD.md).

## Requirements and source setup

In the command below, replace `REPOSITORY_URL` with the HTTPS clone URL from the repository's GitHub **Code** menu.

- Node.js **22.13.0 or newer** with built-in `node:sqlite`; no third-party npm runtime dependencies.
- Google Antigravity with support for the plugin/MCP features used here.
- Permission to inspect the intended workspace; protected roots, sensitive files and revoked workspaces remain denied.

```sh
git clone REPOSITORY_URL pilah
cd pilah
node --version
npm run check
node scripts/check-release.mjs
node scripts/pilah.mjs doctor
node scripts/pilah.mjs doctor --public  # Redacted diagnostics for issue reports
node scripts/pilah.mjs host-check  # requires agy; may report blocked
```

The optional `host-check` command only validates the CLI's plugin manifest and whether PILAH appears in plugin listings. It cannot certify tool selection, browser workflows or independent E2E behavior. Missing `agy` is reported as blocked, not passed.

Install/register this **source checkout** using the native plugin manager supported by your Antigravity version. If the `agy` CLI is available, validate it with `agy plugin validate --strict .` and inspect `agy plugin list`. These are **steps for your machine**, not claims of a completed live installation test. For real host acceptance criteria, see [the host-validation runbook](docs/HOST_VALIDATION.md). The bundle includes `plugin.json`, `mcp_config.json`, `hooks.json`, `rules/AGENTS.md` and `skills/pilah/SKILL.md`.

Do not assume npmjs publication from the manifest alone; independently verify the desired `@aliip/pilah` version in the npmjs registry before installing. Avoid registering duplicate plugin instances unless explicitly intended.

## CLI from a checkout

The supported source CLI is `scripts/pilah.mjs`, and the package manifest declares `pilah` as its preferred binary name. The following commands are **CLI subcommands**, not guaranteed Antigravity slash commands:

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
node scripts/pilah.mjs privacy status /absolute/path/to/project
node scripts/pilah.mjs impact /absolute/path/to/project src/auth.js
node scripts/pilah.mjs tokens --limit 5 --json
node scripts/pilah.mjs route --profile economy --task cross-file --uncertain
```

**Defaults:** On-Demand and Compact. Always-On remains opt-in and does not require a tool call for simple tasks. Context Guardian is separate, also opt-in, and does not compact conversations automatically. `tokens` distinguishes observed metadata and estimates from provider-reported usage; **model token savings cannot be inferred from a smaller response or fewer MCP calls**.

For intentionally clearing locally stored workspace records, run `node scripts/pilah.mjs privacy purge /absolute/path/to/project --confirm-purge`. This deletes only the project's scoped SQLite records; it **does not** delete source files, evidence artifacts on disk, trust grants, or unscoped historic notes. Back up anything you need first.

`inspect` includes bounded file-scan I/O diagnostics. Use `node benchmarks/bench.mjs` to measure cold/warm local indexing, rather than treating bytes scanned as model token usage.

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

## Compatibility with earlier installations

Public MCP tools use the `pilah_*` prefix. Previous tool and CLI aliases, environment settings and local data remain supported internally, so existing installations retain their workspace authorization and saved history. For the exact compatibility identifiers, consult [tool definitions](src/tools.mjs) and [security source](src/security.mjs). Do not guess or rename configuration keys.

Use the repository URL from the GitHub **Code** menu to clone. Do not delete existing configuration or database folders when installing PILAH.

## Testing, CI and release

Routine CI now uses **1 full-suite PR job** on Ubuntu/Node 24, **3 jobs on main** (Ubuntu/macOS/Windows, Node 24), with the **full 9-job OS × Node 22/24/26.13.1 matrix** available by manually dispatching the workflow. A green repository CI run is not a live Antigravity acceptance or publication authorization. Package publication runs exist, but registry availability and independent release approval are separate checks; see the release process.

- [Documentation index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Compatibility](docs/COMPATIBILITY.md)
- [CI and efficiency methodology](docs/CI_EFFICIENCY.md) · [Release process](docs/RELEASE.md)
- [Status](BUILD_STATUS.md) · [Outstanding independent validation](docs/MAIN_VALIDATION_BACKLOG.md)

[MIT](LICENSE) © 2026 Alif Akbar and contributors.
