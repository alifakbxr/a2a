# Contracts and Data Dictionary

> Specifications, schema guarantees, and database lifecycles for A2A.

---

## 🛠️ Public MCP Interface

All primary tools are defined in [schemas/mcp-tools.json](file:///home/alifakbxr/.gemini/config/plugins/a2a/schemas/mcp-tools.json) and exported over JSON-RPC 2.0 stdio:

### 1. Core Tools

| Tool | Action / Operation | Description |
| :--- | :--- | :--- |
| **`a2a_context`** | `inspect`, `query`, `skeleton`, `tokens`, `freshness` | Workspace identity, revision snapshot, lexer-stripped skeleton, and session token telemetry. |
| **`a2a_impact`** | `depth` (1–4), `changed` paths | Bounded static graph impact analysis, reverse dependencies, and test recommendations. |
| **`a2a_verify`** | `plan`, `assess`, `verify_handoff` | Acceptance criteria evaluation, machine test report verification, and subagent handoff validation. |
| **`a2a_evidence`** | `list`, `runs`, `incidents`, `side_questions` | Provenance records, regression hypotheses, and Antigravity side questions (`/btw`). |

> [!NOTE]
> Legacy `verifykit_*` aliases remain available for backward compatibility and can be listed by setting `A2A_LEGACY_TOOL_ALIASES=1`.

### 2. Live MCP Resources

| URI | Resource Name | Description |
| :--- | :--- | :--- |
| `a2a://status` | A2A Status | Active operating mode, compact mode, auto-trust policy, and authorized paths. |
| `a2a://tokens/session` | Token Telemetry | Session token consumption and cache hit metrics from Antigravity transcripts. |
| `a2a://workspace/summary` | Workspace Summary | Active project code graph coverage and token footprint summary. |
| `a2a://side-questions` | Side Questions | Logged side questions (`/btw`) and exploration notes. |

---

## 🗄️ SQLite Data Dictionary (`a2a.sqlite`)

The executable DDL is defined in [schemas/database.sql](file:///home/alifakbxr/.gemini/config/plugins/a2a/schemas/database.sql):

| Table | Responsibility | Lifecycle |
| :--- | :--- | :--- |
| `meta` | Schema versioning (v1) | Updated only by explicit migration |
| `workspaces` | Canonical workspace roots & active revision pointer | User / IDE managed |
| `revisions` | Workspace source snapshots & environment metadata | Upserted on detected changes |
| `files` | Monitored file paths, content SHA-256, language, `mtime_ms` | Incrementally synced |
| `nodes` | Source symbols, functions, classes, and features | Incrementally synced |
| `edges` | Relations (`IMPORTS`, `DECLARES`, `CALLS`, `MAY_TEST`) | Incrementally synced |
| `evidence` | Immutable test report hashes and verification outcomes | Append-only |
| `runs` | Aggregated test run verdicts and criteria evaluation | Append-only |
| `incidents` | Root-cause claims, related paths, and evidence links | Append-only |
| `hypotheses` | Regression hypotheses and experimental validations | Append-only |
| `telemetry` | Measured `raw_scope_tokens`, `response_tokens`, `tokens_saved` | Append-only |
| `side_questions` | Antigravity side questions (`/btw`) and exploration notes | Persisted & queryable |

---

## 🔒 Verification & Freshness Constraints

1. **State Constraints:**
   - `node.basis`: `source` (directly parsed from AST/lexer) vs. `derived` (heuristic convention).
   - `edge.state`: `observed` (extractable import or call) vs. `derived` (naming match). Derived edges never produce verified test verdicts.
2. **Freshness Rule:**
   - Evidence artifacts are bound to `revision_id` and artifact SHA-256. Any subsequent file edits update `revision_id`, immediately marking historical evidence `fresh=false`.
3. **Supported Test Report Formats:**
   - **JUnit XML:** Validates `<testsuite>` and `<testcase>` records. Total counts must match parsed individual test case outcomes.
   - **TAP (Test Anything Protocol):** Validates `ok N` and `not ok N` assertions and matches optional `1..N` test plans.
   - **`a2a-test-report-v1` JSON:** Machine report schema with `completed: true` and an array of individual test case states (`passed`, `failed`, `skipped`).
