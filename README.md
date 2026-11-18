# A2A (Agent to Alif)

<p align="center">
  <img src="https://raw.githubusercontent.com/alifakbxr/a2a/main/assets/logo.svg" alt="A2A Logo" width="90" />
</p>

<p align="center">
  <strong>Local-First Code Intelligence, Impact Analysis, Token Telemetry & Verification for Google Antigravity.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aliip/a2a"><img src="https://img.shields.io/npm/v/@aliip/a2a?color=blue&logo=npm" alt="npm version" /></a>
  <a href="https://github.com/alifakbxr/a2a/actions"><img src="https://github.com/alifakbxr/a2a/actions/workflows/ci.yml/badge.svg?branch=v2.0.1" alt="Tests" /></a>
  <a href="https://github.com/alifakbxr/a2a"><img src="https://img.shields.io/badge/Antigravity-native%20plugin-blueviolet" alt="Antigravity Plugin" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License" /></a>
  <img src="https://img.shields.io/badge/dependencies-0%20external-success" alt="Zero External Dependencies" />
</p>

---

**A2A** provides risk-aware, evidence-scoped guidance to Antigravity without replacing its native coding agent. It reduces unnecessary full-file context dumps with local graph indexing (`node:sqlite`), lexer-safe skeletonization, and strict machine verification gates.

---

## ⚡ Highlights

- 📉 **Scoped code previews:** On-demand symbol queries and comment-stripped source previews can reduce output size, but net session savings require A/B evaluation. `a2a tokens` now reports **source-size estimates**, never invented savings.
- 🔍 **Shift-Left Impact Analysis:** Maps reverse imports and dependent test suites *before* modifying code.
- 🛡️ **Evidence-scoped verification:** Reports the scope of named JUnit/TAP/JSON assertions and keeps independent release/semantic/browser proof separate. Passing tests alone do not certify an application.
- 🤝 **Native orchestration guidance:** Suggests available worker modes only when useful and approved; optional evidence review for handoffs never launches workers automatically.
- 🔒 **Zero-Trust & Local-First:** no outbound runtime requests, no cloud telemetry, no external dependencies. External engineering sources are research references only.

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
| **`a2a_verify`** | `plan`, `assess`, `verify_handoff`, `assess_release`, `assess_semantic`, `assess_browser` | Scopes test reports, risk-specific quality plans and evidence trust; never executes tests itself. |
| **`a2a_evidence`** | `list`, `runs`, `incidents`, `side_questions` | Historical run verdicts, regression memory, and Antigravity `/btw` side questions. |

---


### Token usage across all conversations

A2A can read **older Antigravity conversations even if they were created before A2A was installed**. There is no background collection, no upload, and no need to re-run an old conversation.

```bash
node scripts/a2a.mjs tokens                      # All available local conversations; plain-English report
node scripts/a2a.mjs tokens --limit 5            # Show five recent conversations
node scripts/a2a.mjs tokens --current            # Focus display on the latest conversation
node scripts/a2a.mjs tokens --json               # Machine-readable report
node scripts/a2a.mjs tokens --include-subagents  # Also include worker/subagent transcripts
node scripts/a2a.mjs tokens --usage-file run.json # Attach actual CLI-reported usage for a captured run
```

A2A separates **official CLI token totals** from **internal log counters**, which are not validated as Gemini billing usage. The current session shows its latest *completed* model step where available; the actual context window and current in-progress model call are not directly observable. The report also estimates the size of its **own response** if passed back into Gemini, but never calls that estimate billable tokens.

Inside Antigravity, `a2a_context(action="tokens", history_scope="all")` explicitly requests global history. The default `history_scope="current"` is restricted to the latest recorded conversation. Full explanation: [Conversation usage and privacy](docs/CONVERSATION_USAGE.md).

## 📚 Deep Dives & Documentation

- **[Token efficiency evaluation](docs/TOKEN_EFFICIENCY.md):** Reproducible A/B protocol; source-size comparisons are not net session savings.
- **[Always-On 5 Whys](docs/ALWAYS_ON_5_WHYS.md):** Five causal scenarios, corrective changes, and acceptance checks.
- **[Native-first workflow](docs/NATIVE_FIRST_WORKFLOW.md):** Zero-call fast path, scoped risk reviews and native test/browser ownership.
- **[OSS maintainer engineering standards](docs/OPEN_SOURCE_ENGINEERING_STANDARDS.md):** Internal A2A review principles adapted from Laravel, Vue, SQLite and others — no third-party packages or integrations.
- **[Independent acceptance runbook](docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md):** External benchmark and release gates not yet satisfied.

- 🏛️ **[Technical Architecture](docs/ARCHITECTURE.md):** Invariants, SQLite schema, and sequence diagrams.
- 📜 **[Contracts & Data Dictionary](docs/CONTRACTS.md):** MCP schemas, SQLite tables, and verification constraints.
- 🌐 **[Ecosystem Compatibility](docs/COMPATIBILITY.md):** Language support (Node, Go, PHP, Python, Rust, Java, Dart, Swift, .NET).
- 🔐 **[Security & Threat Model](docs/SECURITY.md):** Protected roots, workspace allowlist, and zero-network boundary.

---

## 📄 License

[MIT License](LICENSE) © 2026 **Alif Akbar** & Contributors.
Made with ❤️ for Google Antigravity.
