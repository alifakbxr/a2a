# PILAH Documentation

Technical documentation index for **PILAH** (*Project Intelligence, Logic, Analysis & Handoffs*) on Google Antigravity.

Official repository: [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Stable source baseline: **1.1.1**. Registry publication requires independent authorization.

[Changelog](../CHANGELOG.md) · [Build status](../BUILD_STATUS.md) · [Quick start](../README.md).

---

## 1. Architecture & Engineering Guides

- [System Architecture & Components](ARCHITECTURE.md): Internal components, scanner data flow, and IDE integration boundaries.
- [Engineering Method & Native-First Principles](ENGINEERING_METHOD.md): Comparison with Claude Code patterns, fast iteration, and zero-call philosophy.
- [MCP Schema Contracts](CONTRACTS.md): Full parameter definitions, type validations, and outputs for all 4 MCP tools.
- [Native-First Workflow](NATIVE_FIRST_WORKFLOW.md): Decision matrix on when to use native Antigravity capabilities vs PILAH.
- [System Compatibility](COMPATIBILITY.md): Node.js versions, operating systems (Linux, macOS, Windows), and Antigravity environments.
- [Agent Skills Discovery](SKILL_DISCOVERY.md): v1.2.0 Skill catalog, host-specific paths, deterministic ranking and activation boundaries.
- [Workspace Security & Privacy](SECURITY.md): Workspace authorization model, local SQLite isolation, and sensitive file protection.

---

## 2. Testing, Efficiency & Releases

- [Host Validation](HOST_VALIDATION.md): Local preflight procedures for verifying plugin registration on `agy` CLI.
- [Headless Capture Audit](HEADLESS_CAPTURE_AUDIT.md): Offline metadata-only analysis of CLI token captures, quota errors and permission-denied runs.
- [CI Efficiency & Runner Budget](CI_EFFICIENCY.md): GitHub Actions runner configuration for fast and resource-efficient testing.
- [Release Process & Registry Verification](RELEASE.md): Pre-release checklist and package publication verification.
- [Release Authorization](RELEASE_AUTHORIZATION.md): Independent release verification contract and commit integrity.
- [Validation Backlog](MAIN_VALIDATION_BACKLOG.md): Status of functional testing and deferred/superseded items.
- [Token Efficiency](TOKEN_EFFICIENCY.md): Prompt optimization guidelines, transcript diagnostics, and token-saving boundaries.

---

## Historical implementation audits and research — reference only

Technical audit history and research records are preserved in the git commit history to track PILAH's design evolution.
