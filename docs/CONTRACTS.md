# Contracts and Data Dictionary

## Public MCP interface

All four tools are exported in `schemas/mcp-tools.json`. Their definitions are generated from `src/tools.mjs`; changes require regenerating the file and rerunning tests. All tools require an explicitly authorized absolute `workspace` path.

- **`verifykit_context`** — `inspect` returns workspace identity, revision, graph coverage, detected ecosystem candidates; `query` performs bounded search; `freshness` checks source and report hashes.
- **`verifykit_impact`** — consumes explicit changed relative paths or Git working-tree changes. Returns affected nodes, possible tests, risk level and uncertainty. Depth is bounded (1–4).
- **`verifykit_verify`** — `plan` accepts criterion descriptions and returns test runner candidates; `assess` accepts objects `{id, artifact, test_name}`. `test_name` is an **exact** machine-reported test case name or `*` to bind a whole suite. Never use `*` for a narrow criterion just to make verification pass.
- **`verifykit_evidence`** — `list`, `runs`, `incidents`, `hypotheses` query provenance; `record_incident` and `add_hypothesis` save structured metadata only.

Return statuses include `passed`, `failed`, `blocked`, `inconclusive`, tool-level `error` and read-time `fresh`. Every successful method response includes a source revision where relevant. Commands suggested by `plan` are **not** guaranteed safe: inspect and run them via native permissions.

## SQLite data dictionary

| Table | Responsibility | Lifecycle |
| --- | --- | --- |
| `meta` | schema version (initially 1) | updated only by explicit migration |
| `workspaces` | canonical root and isolated workspace ID | user-managed |
| `revisions` | immutable source snapshots and environment label | append-only |
| `files` | current paths, hashes, language, size | rebuild on indexing |
| `nodes` | source symbols/files + derived features | rebuild on indexing |
| `edges` | typed relations, basis, state, source | rebuild on indexing |
| `evidence` | immutable report hashes and mapped outcomes | append-only |
| `runs` | aggregate verdict and criterion results | append-only |
| `incidents` | root-cause claims and evidence links | append-only |
| `hypotheses` | alternative explanations and proposed experiments | append-only |

The executable DDL is `schemas/database.sql`. All database writes happen inside a local plugin-owned directory. No schema migration to an unknown future version is performed automatically.

## State constraints

`node basis`: `source` for directly extracted structure; `derived` for heuristics. `edge state`: `observed` for extractable imports/containment; `derived` for naming matches. A `derived` relationship is never a test verdict.

`incident state`: `hypothesized` or `evidence-linked` (the latter **does not** mean confirmed root cause). `hypothesis status` begins `untested` and cannot be promoted by tool calls without a mechanism for confirming evidence.

`evidence status`: `passed|failed|blocked|inconclusive`; bounded by current revision and report hash. `run verdict`: aggregation of all explicit required mapped criteria.

## Supported report formats

- JUnit XML with `<testsuite>` and one or more explicit `<testcase>` records. Aggregate metadata must match actual testcase counts and failures; incomplete reports are inconclusive.
- TAP with `ok N - name` and `not ok N - name`, optional `1..N` plan. A present plan must match assertion count. Test names are matched exactly.
- `verifykit-test-report-v1` JSON with `completed: true` and one or more cases `{name,state}`. Valid case states are `passed`, `failed`, `skipped`. This format is for instrumentation from a trusted test harness, never for self-reported AI claims.

No arbitrary free-form terminal transcript can produce a passing verdict. Screenshots, videos and browser walkthroughs can be referenced as external evidence by the native agent, but VerifyKit does **not** turn image appearance into a verified assertion.
