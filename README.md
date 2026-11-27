# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — native-first code intelligence for Google Antigravity.

PILAH helps an agent understand a codebase, scope change impact and plan verification without replacing the host's native tools. It does not edit your project, execute tests or switch models on its own.

**Version 1.1.1 — stable source baseline (source only).** CI on the exact source commit passed **3/3** Node 24 OS jobs ([run](https://github.com/alifakbxr/pilah/actions/runs/45945302975)). The latest npmjs publication recorded by this project is `@aliip/pilah@1.1.0`; publication of 1.1.1 is not verified. The `v1.1.1` Git tag and GitHub Release are source-only, not package publication or authorization. Independent installed-host and F01–F18 acceptance remain **unverified**. See [status](BUILD_STATUS.md).

[Getting started](#quick-start) · [Documentation](docs/README.md) · [Changelog](CHANGELOG.md) · [License](LICENSE)

## Quick start

### 1. Install the CLI

The latest npmjs publication recorded by this project is `@aliip/pilah@1.1.0`. Check the live registry version before installing:

```sh
npm view @aliip/pilah version --registry=https://registry.npmjs.org/
npm install -g @aliip/pilah@1.1.0
pilah doctor
```

Installing the npm package gives you the PILAH CLI. It is separate from registering the Antigravity plugin.

### 2. Install the Antigravity plugin

Install the registry package through the Antigravity CLI:

```sh
agy plugin install @aliip/pilah
agy plugin list --json
```

Or install the current source from GitHub (v1.1.1):

```sh
agy plugin install github:alifakbxr/pilah
```

For local development, clone the repository and install the checkout:

```sh
git clone https://github.com/alifakbxr/pilah.git
cd pilah
agy plugin install .
agy plugin validate --strict .
agy plugin list --json
node scripts/pilah.mjs doctor
npm run check
node scripts/check-release.mjs
```

Where supported by your Antigravity version, the plugin can also be added from **Settings → Customizations → Add Plugin** using `@aliip/pilah` or the repository URL. Menu labels and remote-source support can vary by host version.

**Version distinction:** the npm registry install resolves the published package version (currently recorded as 1.1.0), while the GitHub source install uses the 1.1.1 source baseline. The 1.1.1 Git tag/Release does not mean that 1.1.1 has been published to npm.

An installed plugin or successful CLI preflight is not proof the IDE has loaded and selected its MCP tools; use the [host validation runbook](docs/HOST_VALIDATION.md).

## Four MCP tools

| Tool | Use only when | Output |
| --- | --- | --- |
| `pilah_context` | Project ownership or symbols are unclear | Bounded local source and dependency context |
| `pilah_impact` | A proposed edit may affect other files | Static impact candidates and relevant test suggestions |
| `pilah_verify` | Acceptance needs to be structured | Given/When/Then plans, not automatically executed tests |
| `pilah_evidence` | A result or checkpoint needs recording | Revision-scoped evidence and recovery notes |

`pilah_context` is the eager discovery entry point; the other three use lazy discovery. **Native-first:** simple, well-scoped work should not require a PILAH tool call. See the [MCP contracts](docs/CONTRACTS.md) and [native-first workflow](docs/NATIVE_FIRST_WORKFLOW.md).

Example scoped verification request:

```json
{
  "workspace": "/path/to/project",
  "operation": "plan",
  "criteria": [
    {
      "id": "prevent-duplicate-order",
      "given": "An order is finalized",
      "when": "A duplicate payment request arrives",
      "then": "Reject the request with HTTP 409",
      "evidence_type": "integration",
      "negative": true
    }
  ]
}
```

Evidence remains `not_tested` until an actual native test provides valid provenance. Static impact results are not runtime guarantees.

## CLI reference

Run commands as `node scripts/pilah.mjs <command>` in a checkout, or use `pilah <command>` after global installation.

```sh
node scripts/pilah.mjs help
node scripts/pilah.mjs doctor
node scripts/pilah.mjs mode on-demand
node scripts/pilah.mjs mode always-on
node scripts/pilah.mjs toggle
node scripts/pilah.mjs compact on
node scripts/pilah.mjs autotrust active-only
node scripts/pilah.mjs allow /path/to/project
node scripts/pilah.mjs revoke /path/to/project
node scripts/pilah.mjs inspect /path/to/project
node scripts/pilah.mjs impact /path/to/project src/index.js
node scripts/pilah.mjs tokens --limit 5 --json
```

Grant workspace access explicitly. Token diagnostics are not provider billing and cannot independently establish savings; use the [headless audit guide](docs/HEADLESS_CAPTURE_AUDIT.md) for captured A/B runs.

## Documentation

- [Documentation index](docs/README.md) and [architecture](docs/ARCHITECTURE.md)
- [Compatibility](docs/COMPATIBILITY.md) and [security model](docs/SECURITY.md)
- [Contribution guide](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [Security Policy](SECURITY.md), and [Support](SUPPORT.md)
- [Source CI status](BUILD_STATUS.md), [release process](docs/RELEASE.md), and [release authorization](docs/RELEASE_AUTHORIZATION.md)
- [External validation backlog](docs/MAIN_VALIDATION_BACKLOG.md) and [changelog](CHANGELOG.md)

PILAH is MIT licensed. © 2026 Alif Akbar and contributors.
