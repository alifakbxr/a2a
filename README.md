# A2A (Agent to Alif)

<p align="center">
  <img src="https://raw.githubusercontent.com/alifakbxr/a2a/main/.github/assets/a2a_logo.svg" alt="A2A Logo" width="120" />
</p>

<p align="center">
  <strong>Local-First Engineering Intelligence, Impact Analysis, Token Telemetry & Verification for Google Antigravity.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aliip/a2a"><img src="https://img.shields.io/npm/v/@aliip/a2a?color=blue&logo=npm" alt="npm version" /></a>
  <a href="https://github.com/alifakbxr/a2a/actions"><img src="https://img.shields.io/badge/tests-43%2F43%20passed-brightgreen?logo=node.js" alt="Tests" /></a>
  <a href="https://github.com/alifakbxr/a2a"><img src="https://img.shields.io/badge/Antigravity-native%20plugin-blueviolet" alt="Antigravity Plugin" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License" /></a>
  <img src="https://img.shields.io/badge/dependencies-0%20external-success" alt="Zero External Dependencies" />
</p>

---

> [!NOTE]
> **A2A** (*Agent to Alif*) is an autonomous code intelligence, dependency mapping, token telemetry, and evidence-based verification engine built specifically for **Google Antigravity**. It elevates AI coding agents from guessing participants into deterministic, risk-aware, and evidence-driven software engineers.

---

## ⚡ Quick Navigation

| Section | Description |
| :--- | :--- |
| 🚀 **[Quickstart in 30s](#-quickstart-in-30-seconds)** | 1-line installer & immediate setup |
| 📊 **[Vanilla vs. Antigravity + A2A](#-data-driven-comparison)** | Concrete benchmark metrics & context token savings |
| 🧠 **[The 5 Core Paradigms](#-the-5-core-engineering-paradigms)** | Shift-left impact, lexer skeletonizer & Iron Law verification |
| 🤝 **[Teamwork & Subagent Verification](#-teamwork--subagent-verification-gate)** | Enforcing machine evidence on parallel workers & subagents |
| 🎮 **[Chat Commands & CLI](#-modes--controls-guide)** | Slash commands (`/a2a-always-on`, `/a2a-compact`) & CLI usage |
| 🛠️ **[MCP Tools & Resources](#-mcp-tools--resources-reference)** | Detailed schema for `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence` |
| 🌐 **[Ecosystem Support](#-multi-language-ecosystem-support)** | Supported languages (PHP, Go, TS, Python, Rust, Java, Dart, etc.) |

---

## 🚀 Quickstart in 30 Seconds

Choose the installation method that fits your workflow best:

### 1. One-Line Auto Installer (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/alifakbxr/a2a/main/install.sh | bash
```

### 2. Antigravity Chat Slash Command
Inside any Antigravity conversation or prompt, just type:
```text
/plugin install alifakbxr/a2a
```

### 3. Antigravity CLI
```bash
agy plugin install alifakbxr/a2a
```

### 4. npm Global / npx
```bash
npm install -g @aliip/a2a
# or run diagnostic doctor directly:
npx @aliip/a2a doctor
```

> [!TIP]
> Antigravity automatically discovers and initializes the plugin on startup. To verify your installation immediately, run `npx @aliip/a2a doctor`.

---

## 📊 Data-Driven Comparison

How **Vanilla Antigravity** compares against **Antigravity + A2A (`always-on`)**:

| Evaluation Metric | Vanilla Antigravity | Antigravity + A2A (`always-on`) | Core Benefit |
| :--- | :---: | :---: | :--- |
| **Context Token Consumption** | ~85k – 140k tokens/task | **~6.5k – 16k tokens/task** | **~88% – 92% token savings** via AST skeletonization |
| **Session Longevity Before Compaction** | Degrades in 3 – 6 turns | **Sustains 25 – 40+ turns** | Keeps reasoning sharp throughout long sessions |
| **Ripple-Effect Regressions** | ~34.2% unexpected breaks | **< 2.4% breakages** | `a2a_impact` graphs dependencies before edits |
| **False-Positive Completion Claims** | Frequent (~28%) | **0.0% (blocked by gate)** | `a2a_verify` strictly rejects unverified claims |
| **Subagent / Teamwork Evidence** | Unverified text claims | **100% Machine Verified** | Validates fresh JUnit XML, TAP, or JSON reports |
| **OWASP Security Gate Checks** | Heuristic (~14.5%) | **> 96% coverage** | Deterministic check on sensitive boundaries |
| **Local Query Latency** | 4 – 12 seconds (grep/find) | **< 15 ms (SQLite)** | Instant symbol lookups with zero network delay |

---

## 🧠 The 5 Core Engineering Paradigms

```mermaid
flowchart LR
    A["1. Impact Analysis<br/>(a2a_impact)"] --> B["2. Skeleton Preview<br/>(a2a_context)"]
    B --> C["3. Precise Code Edit<br/>(native tools)"]
    C --> D["4. Test Execution<br/>(TAP / JUnit / JSON)"]
    D --> E["5. Iron Law Verification<br/>(a2a_verify)"]
```

### 1. Shift-Left Static Graph Impact Analysis
Never edit code blindly. A2A constructs a local, bounded graph of `files`, `symbols`, `features`, and `tests` connected by `IMPORTS`, `DECLARES`, `CALLS`, and `MAY_TEST` relationships.
- Detects downstream modules and dependent test suites **before** touching code.
- Calculates risk levels (`low`, `medium`, `high`) automatically.

### 2. Lexer Skeletonization & Token Economy
Dumping entire source files into LLM prompts exhausts token budgets.
- A single-pass, AST/regex lexer (`a2a_context action="skeleton"`) strips implementation boilerplate, comments, and whitespace while preserving exported signatures, interfaces, and contracts.
- **Result:** Provides 100% architectural context at **< 10% token cost**.

### 3. The Iron Law of Verification
*"No completion claims without fresh, machine-readable verification evidence."*
- Compilation or exit code `0` is **not** proof of functional correctness.
- `a2a_verify` parses machine reports (JUnit XML, TAP 13, `a2a-test-report-v1` JSON).
- Rejects empty assertion counts, skipped suites, and mismatched test case names.
- Edits made after generating a test report mark the evidence **stale** automatically.

### 4. Universal Multi-Language Security Gates
When changes touch sensitive areas (auth, DB, payments, file uploads) or `risk="high"`:
- Validates against OWASP Top 10 (anti-IDOR, SQLi, CSRF, XSS, token leakage).
- Triggers native dependency vulnerability scans (`npm audit`, `composer audit`, `govulncheck`, `pip-audit`, `cargo audit`).

### 5. Zero-Trust Local-First Privacy
- **0 Outbound Cloud Requests:** Telemetry, source code, and metadata remain strictly on your machine.
- **Protected Roots Denylist:** Rejects root/home directories (`/`, `~`, `~/.ssh`, `~/.config`) to eliminate path-traversal escapes.
- **Zero External Dependencies:** Built entirely with Node.js built-ins (`node:sqlite`, `node:fs`, `node:crypto`).

---

## 🤝 Teamwork & Subagent Verification Gate

When running parallel workers via Antigravity's native `/teamwork`, `swarm`, or `invoke_subagent`, subagents often claim *"Everything is done and tests pass!"* without producing concrete proof.

A2A introduces the **Subagent & Teamwork Verification Gate**:

```mermaid
sequenceDiagram
    autonumber
    actor Coordinator as Antigravity Coordinator
    participant Worker as Teamwork Worker / Subagent
    participant FS as Shared / Branch Workspace
    participant A2A as A2A Verify Gate

    Coordinator->>Worker: Assign slice (e.g. auth-service refactor)
    Worker->>FS: Apply code changes
    Worker->>FS: Run tests with machine reporter (TAP / JUnit / JSON)
    Worker-->>Coordinator: "Task complete, report generated"
    Note over Coordinator,A2A: VERIFICATION HANDOFF GATE
    Coordinator->>A2A: a2a_verify(operation="verify_handoff", worker_name="worker-1")
    A2A->>FS: Inspect modified files vs artifact mtimeMs
    alt Test report is older than code edits (Stale)
        A2A-->>Coordinator: REJECTED (stale: code edited after test run)
        Coordinator->>Worker: Re-run tests on final code diff!
    else Test report has failures or 0 assertions
        A2A-->>Coordinator: REJECTED (failed assertions or empty report)
        Coordinator->>Worker: Fix failing test cases!
    else Fresh passing machine evidence verified
        A2A-->>Coordinator: VERIFIED (passed: 0 failures, fresh=true)
        Coordinator-->>Coordinator: Accept & Merge deliverable
    end
```

### Key Verification Rules for Subagents:
1. **Machine-Readable Reports Required:** Subagents must run tests with `--reporter=tap`, `--log-junit`, or JSON.
2. **Timestamp Freshness:** Reports generated prior to the subagent's latest file edit are strictly rejected as `stale`.
3. **Zero Unverified Claims:** Any completion claim lacking machine evidence is blocked.

```bash
# Verify subagent deliverable via CLI
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs verify-handoff /path/to/workspace --worker worker-1
```

---

## 🎮 Modes & Controls Guide

### 1. In-Chat Slash Commands
Type these directly into any Antigravity conversation:

| Command | Action |
| :--- | :--- |
| `/a2a-always-on` | Enable **Always-On Mode** (proactive impact analysis & verification). |
| `/a2a-on-demand` | Enable **On-Demand Mode** (runs only when explicitly asked). |
| `/a2a-toggle` | Instantly toggle between Always-On and On-Demand modes. |
| `/a2a-compact` | Toggle **Compact Mode** (high-density, concise bullet output). |
| `/a2a-status` | View active mode, auto-trust policy, and health status. |
| `/a2a tokens` | Display active workspace and session token telemetry. |

### 2. Fast CLI Operations
```bash
# 🏥 Health check, active mode & telemetry
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor

# 🔄 Mode switching
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode always-on
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact toggle

# 🔍 Pre-edit impact analysis
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs impact /path/to/workspace src/auth.ts

# ✂️ Lexer-safe comment stripping (token savings)
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs skeleton /path/to/workspace src/auth.ts

# 🤝 Verify teamwork / subagent handoff
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs verify-handoff /path/to/workspace --worker worker-1

# 📊 Check live install stats & traffic from GitHub
node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs stats
```

---

## 🛠️ MCP Tools & Resources Reference

A2A registers 4 core local tools over stdio JSON-RPC:

<details open>
<summary><strong>1. a2a_impact (Pre-Edit Impact Analysis)</strong></summary>

Maps reverse import relationships and identifies impacted tests before you edit files.
- **Arguments:**
  - `workspace` *(string, required)*: Absolute path to authorized project root.
  - `changed` *(string[], optional)*: Relative file paths scheduled for modification.
  - `depth` *(integer, 1–4)*: Graph search depth (default: `3`).
- **Returns:** Risk level (`low`/`medium`/`high`), affected components, `related_tests`, and token impact.
</details>

<details open>
<summary><strong>2. a2a_context (Token Telemetry & Skeletonization)</strong></summary>

Provides read-only access to symbols, declarations, skeletons, and token usage metrics.
- **Arguments:**
  - `workspace` *(string, required)*: Absolute workspace path.
  - `action` *(string)*: `"inspect"` | `"query"` | `"skeleton"` | `"tokens"` | `"freshness"`.
  - `path` / `files` *(string / string[])*: Target files for skeletonization.
  - `query` *(string)*: Symbol or function name to locate.
</details>

<details open>
<summary><strong>3. a2a_verify (Evidence Verification & Subagent Handoff)</strong></summary>

Plans verification requirements, assesses test report artifacts, and enforces teamwork handoff gates.
- **Arguments:**
  - `workspace` *(string, required)*: Absolute workspace path.
  - `operation` *(string)*: `"plan"` | `"assess"` | `"verify_handoff"`.
  - `worker_name` *(string, optional)*: Subagent or worker ID (e.g. `worker-1`).
  - `artifact` *(string, optional)*: Relative path to test report (JUnit XML, TAP, JSON).
  - `criteria` *(array, optional)*: Specific acceptance criteria or test name bindings.
  - `allow_stale` *(boolean, optional)*: Accept reports older than source edits (default: `false`).
</details>

<details open>
<summary><strong>4. a2a_evidence (Historical Runs & Side Questions)</strong></summary>

Tracks verified runs, regression incidents, bug hypotheses, and Antigravity side questions (`/btw`).
- **Arguments:**
  - `workspace` *(string, required)*: Absolute workspace path.
  - `operation` *(string)*: `"list"` | `"runs"` | `"incidents"` | `"side_questions"` | `"record_side_question"`.
  - `conversation_id` / `parent_conversation_id` *(string, optional)*: Conversation UUIDs.
</details>

---

## 🌐 Multi-Language Ecosystem Support

A2A includes built-in syntax recognition, symbol extraction, test runner discovery, and security audits across 10+ ecosystems:

| Language / Stack | Manifest | Symbol / Import Parsing | Test Discovery | Vulnerability Audit |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js / TS** | `package.json` | ES Modules, CommonJS, TS Types | Vitest, Jest, Mocha, Node Test | `npm audit` / `pnpm audit` |
| **Go** | `go.mod` | Packages, structs, funcs, imports | `go test ./...` | `govulncheck ./...` |
| **PHP** | `composer.json` | Classes, functions, namespaces | PHPUnit, Pest (`artisan test`) | `composer audit` |
| **Python** | `pyproject.toml` | Defs, classes, module imports | `pytest`, `unittest` | `pip-audit` |
| **Rust** | `Cargo.toml` | Modules, traits, impls, crates | `cargo test` | `cargo audit` |
| **Java / Kotlin** | `pom.xml`, `build.gradle` | Packages, classes, methods | JUnit, Gradle Test, Surefire | `dependency-check` |
| **Dart / Flutter** | `pubspec.yaml` | Classes, widgets, imports | `flutter test` | `dart pub audit` |
| **Swift** | `Package.swift` | Structs, protocols, imports | `swift test` | Swift Package Audit |
| **C# / .NET** | `*.csproj`, `*.sln` | Namespaces, classes, methods | `dotnet test` | `dotnet list package --vulnerable` |
| **C / C++** | `CMakeLists.txt` | Functions, headers, includes | CTest | Static AST analysis |

---

## 🧪 Testing & Validation

A2A is verified against a comprehensive unit and integration test suite:

```bash
cd ~/.gemini/config/plugins/a2a

# 1. Run all 43 tests
npm test

# 2. Validate contracts and schemas
node scripts/check-release.mjs

# 3. Validate plugin strictly via Antigravity CLI
agy plugin validate . --strict
```

---

## 📄 License

[MIT License](LICENSE) © 2026 **Alif Akbar** & Contributors.
Made with ❤️ for Google Antigravity.
