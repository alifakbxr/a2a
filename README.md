# A2A (Agent to Alif)

<p align="center">
  <img src="https://raw.githubusercontent.com/alifakbxr/a2a/main/assets/logo.svg" alt="A2A Logo" width="90" />
</p>

<p align="center">
  <strong>Local-First Code Intelligence, Impact Analysis, Token Telemetry & Verification for Google Antigravity.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aliip/a2a"><img src="https://img.shields.io/npm/v/@aliip/a2a?color=blue&logo=npm" alt="npm version" /></a>
  <a href="https://github.com/alifakbxr/a2a/actions"><img src="https://img.shields.io/badge/tests-44%2F44%20passed-brightgreen?logo=node.js" alt="Tests" /></a>
  <a href="https://github.com/alifakbxr/a2a"><img src="https://img.shields.io/badge/Antigravity-native%20plugin-blueviolet" alt="Antigravity Plugin" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License" /></a>
  <img src="https://img.shields.io/badge/dependencies-0%20external-success" alt="Zero External Dependencies" />
</p>

---

**A2A** elevates AI coding agents into deterministic, risk-aware, and evidence-driven software engineers. It replaces guessing and full-file context dumps with local graph indexing (`node:sqlite`), lexer-safe skeletonization, and strict machine verification gates.

---

## ⚡ Highlights

- 📉 **Scoped code previews:** On-demand symbol queries and comment-stripped source previews can reduce output size, but net session savings require A/B evaluation.
- 🔍 **Shift-Left Impact Analysis:** Maps reverse imports and dependent test suites *before* modifying code.
- 🛡️ **The Iron Law of Verification:** Rejects task completion unless fresh machine test evidence (JUnit XML, TAP, or JSON) passes.
- 🤝 **Subagent & Teamwork Gate:** Enforces test evidence on parallel `/teamwork` workers and subagents before handoff.
- 🔒 **Zero-Trust & Local-First:** 0 outbound network calls, 0 cloud telemetry, and 0 external dependencies.

---

## 🚀 Quickstart

Install with npm:

```bash
# Option 1: npm (Recommended)
npm install -g @aliip/a2a && a2a doctor

# Option 2: Antigravity Chat Slash Command
/plugin install alifakbxr/a2a
```

---

## 🎮 Controls & Commands

On-demand is the default for new installations. Existing Always-On settings remain unchanged; run `a2a mode on-demand` to opt out of extra proactive checks.

### In-Chat Slash Commands
| Command | Action |
| :--- | :--- |
| `/a2a-always-on` | Enable **Always-On Mode** (proactive impact analysis & verification on every turn). |
| `/a2a-on-demand` | Enable **On-Demand Mode** (activates only when explicitly prompted). |
| `/a2a-toggle` | Instantly switch between Always-On and On-Demand. |
| `/a2a-compact` | Toggle **Compact Mode** (high-density bullet output, zero conversational filler). |
| `/a2a-status` | Display active mode, auto-trust policy, and health status. |
| `/a2a tokens` | Display workspace and session token telemetry. |

### Fast CLI Cheat Sheet
```bash
# Health check, active mode & telemetry
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor

# Pre-edit impact analysis
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs impact /path/to/workspace src/auth.ts

# Lexer-safe comment stripping (token savings)
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs skeleton /path/to/workspace src/auth.ts

# Verify subagent or teamwork handoff
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs verify-handoff /path/to/workspace --worker worker-1
```

---

## 🛠️ MCP Tools Reference

| Tool | Action | Description |
| :--- | :--- | :--- |
| **`a2a_impact`** | `depth`, `changed` | Bounded static graph impact analysis, reverse dependencies, and test targets. |
| **`a2a_context`** | `skeleton`, `inspect`, `query`, `tokens` | Comment-free AST skeletons, symbol lookups, and session token telemetry. |
| **`a2a_verify`** | `plan`, `assess`, `verify_handoff` | Evaluates JUnit XML, TAP, or JSON reports, and validates subagent deliverables. |
| **`a2a_evidence`** | `list`, `runs`, `incidents`, `side_questions` | Historical run verdicts, regression memory, and Antigravity `/btw` side questions. |

---

## 📚 Deep Dives & Documentation

- **[Token efficiency evaluation](docs/TOKEN_EFFICIENCY.md):** Reproducible A/B protocol; source-size comparisons are not net session savings.

- 🏛️ **[Technical Architecture](docs/ARCHITECTURE.md):** Invariants, SQLite schema, and sequence diagrams.
- 📜 **[Contracts & Data Dictionary](docs/CONTRACTS.md):** MCP schemas, SQLite tables, and verification constraints.
- 🌐 **[Ecosystem Compatibility](docs/COMPATIBILITY.md):** Language support (Node, Go, PHP, Python, Rust, Java, Dart, Swift, .NET).
- 🔐 **[Security & Threat Model](docs/SECURITY.md):** Protected roots, workspace allowlist, and zero-network boundary.

---

## 📄 License

[MIT License](LICENSE) © 2026 **Alif Akbar** & Contributors.
Made with ❤️ for Google Antigravity.
