# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — native-first code intelligence for Google Antigravity.

PILAH helps an agent understand a codebase, scope change impact and plan verification without replacing the host's native tools. It does not edit your project, execute tests or switch models on its own.

**Version 1.1.0 — stable source baseline.** The last verified main CI baseline passed **3/3** OS jobs (Ubuntu, macOS, Windows; Node 24). Version-specific CI is checked on the release candidate. Independent installed-host and F01–F18 acceptance remain **unverified**, so stable source is not a claim of registry publication, measured token savings or independently authorized release. See [status](BUILD_STATUS.md).

[Getting started](#quick-start) · [Documentation](docs/README.md) · [Changelog](CHANGELOG.md) · [License](LICENSE)

## Quick start

**Requirements:** Node.js >=22.13.0, Antigravity or its CLI for plugin integration.

Install the npm CLI:

```sh
npm install -g @aliip/pilah
pilah doctor
```

Or work directly from the source:

```sh
git clone https://github.com/alifakbxr/pilah.git
cd pilah
node scripts/pilah.mjs doctor
npm run check
node scripts/check-release.mjs
```

For Antigravity, install a source checkout using `agy plugin install .` or follow the host's supported plugin UI/CLI flow. Verify on your actual machine using:

```sh
agy plugin validate --strict .
agy plugin list --json
node scripts/pilah.mjs host-check
```

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
