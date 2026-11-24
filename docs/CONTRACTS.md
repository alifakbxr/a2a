# PILAH — MCP contracts and data dictionary

The four public tools are `pilah_context`, `pilah_impact`, `pilah_verify`, and `pilah_evidence`. Old `a2a_*` and `verifykit_*` names remain callable but are excluded from the default tool list. Existing A2A settings and local database identities remain unchanged to preserve user data.

**Executable source of truth:** [`src/tools.mjs`](../src/tools.mjs), [generated MCP schema](../schemas/mcp-tools.json), [SQLite DDL](../schemas/database.sql), [plugin manifest](../plugin.json), [hooks](../hooks.json). Current contracts supersede historical examples in earlier audit notes. Documentation is not an executable verifier.

## MCP surface

Four public, JSON-RPC 2.0 **stdio** tools. Every tool requires an **authorized absolute `workspace`**. Legacy `a2a_*` and `verifykit_*` aliases are callable but only listed when `A2A_LEGACY_TOOL_ALIASES=1`.

| MCP tool | `action` / `operation` | Meaning |
| --- | --- | --- |
| `pilah_context` | `inspect`, `query`, `freshness`, `tokens`, `skeleton`, `orchestration` | Code inventory, static graph, tokens, declared native teamwork advisor |
| `pilah_impact` | `changed`, `depth` (1–4), `summary` | Bounded static change-impact analysis; uncertainty remains |
| `pilah_verify` | `plan`, `assess`, `verify_handoff`, `assess_release`, `assess_semantic`, `assess_browser` | Test planning, scoped local machine results, independent signed release assessment |
| `pilah_evidence` | `list`, `runs`, `incidents`, `record_incident`, `add_hypothesis`, `assess_hypothesis`, `hypotheses`, `delete_incident`, `side_questions`, `record_side_question`, `artifact_versions`, `artifact_diff`, `snapshot_artifact`, `save_checkpoint`, `model_recovery`, `tool_recovery` | Revision-bound evidence, incident hypotheses, explicit checkpoints, bounded recovery guidance |

The public operation enums above reflect current `src/tools.mjs`. Additional engine-internal compatibility aliases may exist but are not guaranteed as public input enums. A2A cannot launch native commands, edit project source, run browsers, force model selection or guarantee upstream agent obedience.

### Scope binding and privacy (19 November re-audit)

`persist_plan` (Boolean, default `false`) on `pilah_verify(operation="plan")` stores the entire user-authored acceptance matrix in private SQLite, hashed and bound to the current source revision. The result includes a `plan_id` (or `null` when disabled), `scope_bound` and `scope_persisted`. This is an explicit **local-content retention** opt-in.

Pass `plan_id` on `pilah_verify(operation="assess")`. Provide evidence bindings by `id` (`artifact`, exact `test_name` or `blocked`); the stored Given/When/Then and required evidence type cannot be replaced. Omitted required cases appear as `not_tested`; an outdated plan becomes `stale`, and unexpected IDs or mutated expectations are rejected. After changing source code, explicitly **reissue the identical frozen requirements** with `pilah_verify(operation="plan",plan_id="<old-id>",persist_plan=true,criteria=[])`. This creates a new plan ID at the current revision, resets every case to `not_tested`, and never asserts that tests ran. If a stored criterion explicitly pins a different `source_revision`, reissuing fails closed and the user must review and recreate that requirement with its new revision. Without `plan_id`, a standalone assessment remains backwards compatible but reports `scope_bound:false` and cannot know the original mandatory scenario list.

`verify_handoff` enforces the **same local evidence-kind policy** as `assess`. For browser/visual/hardware/security/independent criteria, named local reports and native hook records never produce `verified:true`. The `verified_scope` field is limited to **named local machine assertions**, with `independently_attested:false`.

PostToolUse native test provenance is **fail-closed**: only an unambiguous numeric exit code zero, without tool error, may set `succeeded:true`. A missing, malformed, conflicting or nonzero exit status does not authenticate a native test run.

Automatic full-content brain Markdown snapshots are **disabled by default**; opt in with `a2a artifact-autosnapshot on` and disable with `off`. Opt-in stores raw local artifact content; disabling does not erase previous versions. User-invoked `snapshot_artifact` is separate.

### Verification plan: typed acceptance

`pilah_verify(operation="plan",criteria=[...])` accepts up to 40 strings (legacy) or objects. **Typed** criteria include:

| Field | Requirement |
| --- | --- |
| `id` | Unique non-empty string, <=160 chars |
| `description` | Optional display label |
| `given`, `when`, `then` | **Required**, 1–200 chars each, when `evidence_type` is supplied |
| `evidence_type` | `build`, `unit`, `integration`, `browser`, `visual`, `hardware`, `security` or `independent` |
| `viewport`, `ui_state`, `reference` | Required for `browser` and `visual` typed scenarios |
| `negative` | Optional Boolean indicating an adversarial/negative path |
| `source_revision` | Optional bounded source revision to bind during assessment |
| `artifact`, `test_name` | For `assess`: relative machine report file + exact testcase name (no wildcard for typed criteria) |
| `blocked` | Explicitly identify inaccessible execution environment |

Example for a native browser acceptance **plan**:

```json
{
  "workspace": "/authorized/project",
  "operation": "plan",
  "criteria": [
    {
      "id": "cart-error-mobile",
      "given": "User has a pending order",
      "when": "The payment API fails",
      "then": "A recoverable error appears and no paid order is persisted",
      "evidence_type": "browser",
      "viewport": "375x812",
      "ui_state": "API failure",
      "reference": "Checkout acceptance spec",
      "negative": true
    }
  ]
}
```

A plan returns `not_tested` plus `completion.fully_verified:false`. For `assess`, supply criteria with explicit `id`, relative `artifact` and `test_name`. Named JUnit/TAP/JSON machine outcomes may pass **only their exact local test assertions**; they do **not** authenticate what a browser or printer truly did. Typed `browser`, `visual`, `hardware`, `security` and `independent` cannot PASS from an ordinary local report. An explicit `source_revision` mismatch is `stale` in the criterion output, while the persisted aggregate run treats unsupported states conservatively. A passing build is never a visual parity verdict.

`completion` is a separate transparency summary: `fully_verified:false`, counts for `passed`, `failed`, `blocked`, `not_tested`, `stale` and `inconclusive`, plus bounded gaps. **Use `assess_release` with independent signed evidence for release decisions, not `assess`.**

### Existing native tool recovery

`pilah_evidence(operation="tool_recovery")` accepts `tool_family` (mcp/browser/filesystem/terminal/other), optional `error_hint` (<=400 chars; avoid secrets), `error_class` (invalid_arguments/context_lost/timeout/permission_denied/missing_file/edit_conflict/unknown) and `retry_count` (0–20). It returns deterministic **guidance only**, `automatic_execution:false`, `retry_same_input:false`, and never copies or stores the raw hint. Native state/schema refresh is required before a changed retry; permission denial requires user consent.

### Explicit checkpoint and resume

`pilah_evidence(operation="save_checkpoint")` uses `conversation_id`, `task_summary` (1–500 chars), up to eight bounded `completed`, `next_steps`, `decisions` and `pending_tests` notes (<=200 chars each). It rejects recognizable plaintext secret assignments and records the **source revision**, not a verified result. `model_recovery` returns source freshness, notes and a `verified:false` warning; changed source makes an older checkpoint stale. Nothing resumes or switches a model automatically. This is distinct from the read-only headless stream checkpoint CLI in [checkpoint recovery](CHECKPOINT_RECOVERY.md).

### Native teamwork

`pilah_context(action="orchestration",task=...)` accepts user-declared tier, available native commands, workstreams, dependencies, milestones, long horizon, hard reasoning and `file_ownership` (`independent`/`shared`/`unknown`). Parallel modes require **independent ownership and low dependencies** plus confirmed command availability. A2A never creates workers and always requires user approval.

## MCP resources

| URI | Meaning |
| --- | --- |
| `a2a://status` | Plugin version and mode flags with redacted counts and booleans only; MCP never returns home/data directories or workspace paths |
| `a2a://tokens/session` | Local session diagnostics; internal counters are not provider-verified token billing |
| `a2a://workspace/summary` | Active workspace static index and coverage |
| `a2a://side-questions` | Opt-in recorded side-question history |

## SQLite (`node:sqlite`, local)

| Table | Purpose |
| --- | --- |
| `meta` | SQLite schema version (v1, additive migrations) |
| `workspaces`, `revisions` | Canonical workspace identity, active source revision and historical snapshots |
| `files`, `nodes`, `edges` | Source path/hash/language/mtime and static graph |
| `evidence`, `runs` | Machine report hashes, scoped verdicts, run history |
| `incidents`, `hypotheses` | User-recorded failures, tested/unverified hypotheses and evidence links |
| `telemetry` | Estimated source/output token footprint, **not net savings** |
| `side_questions` | Explicit side-question metadata/history; opt-in transcript use |
| `artifact_versions` | Explicit versioned Markdown artifact content and diffs (local private storage) |
| `model_recovery_state` | Model failure **category**, sanitized metadata; no raw failure body |
| `recovery_checkpoints` | Explicit user-approved notes, decisions and pending tests bound to revision |

Privacy caveat: explicitly saved artifact versions and checkpoints **can contain content**. Do not store secrets in text notes or snapshot sensitive files. Historical metadata is bounded and not a provider usage API.

## Validation and trust levels

- **JUnit XML:** exact testcase elements and suite counters reconciled; missing/incomplete reports are inconclusive.
- **TAP:** assertion lines, optional plan and skipped/failing cases respected.
- **A2A JSON:** `a2a-test-report-v1` or legacy `verifykit-test-report-v1` with `completed:true` and individual case states.
- **Local reports:** hashed, source-revision-bound, scoped to named assertions. A filename, test name or self-asserted run is not process authentication.
- **Semantic/browser structural reviews:** local **unattested** observations, not an independent witness.
- **External release assessment:** pinned acceptance registry, evaluator Ed25519 signatures per required case, exact source revision, and separate signed reviewer approval tied to the exact `main` commit/version. See [acceptance](ACCEPTANCE_GATE.md) and [publish gate](RELEASE_AUTHORIZATION.md).

## Runtime and bounds

- `node >=22.13.0` and built-in `node:sqlite`, with no third-party runtime package dependencies. Node 26.11+ uses `sqlite.Database`; Node 22 uses the compatible `sqlite.DatabaseSync` fallback. Cross-platform Node 22/24/26.13.1 tests and NVM launcher notes are documented in [Compatibility](COMPATIBILITY.md).
- Local JSON-RPC messages are bounded; tool responses larger than **64 KiB** are rejected, not silently truncated into a false complete verdict. Reduce requested scope.
- Workspace authorization, protected roots, symlink checks and explicit revocation take precedence over convenience. Hooks only record limited local metadata; there is **no `PreInvocation`** hook.
- No third-party browser, runtime model API, prompt content upload or remote A2A telemetry.

For actual error behavior and constraints, consult the executable [MCP server](../src/mcp.mjs), [verification](../src/verification.mjs), [acceptance matrix](../src/acceptance-matrix.mjs), [model recovery](../src/model-recovery.mjs), and [native recovery](../src/native-tool-recovery.mjs).

## Compact output and prompt-budget contract (issue #44)

New installations default to `On-Demand` (**no automatic A2A calls or SessionStart injection**) and `Compact` (**bounded result payloads**). `node scripts/a2a.mjs compact off` explicitly restores fuller responses and persists until changed. Existing explicit user settings have precedence.

In Compact, `pilah_context(action="skeleton")` limits previews to 4,800 characters total, 1,600 per file, and six previewed files out of up to 20 requested. Requested-but-omitted paths are returned with `skipped:true` and reason `compact_file_budget`; partial previews carry `truncated:true`, and summary counters disclose omissions. `action="query"` caps static relation rows at 12 and sets `relations_truncated:true` plus `relations_before_compaction` when necessary. This count refers to the query response *before compaction*, not total possible project edges. Impact `summary:true` retains its existing risk/uncertainty/coverage semantics.

Only local payload bytes/characters and heuristic estimates are measurable by these APIs; neither the skill nor the `a2a tokens` CLI can prove provider billing or net token savings. Tool outputs that are truncated must not be presented as complete analysis. See [token efficiency](TOKEN_EFFICIENCY.md).

## Adaptive RCA / 5 Whys contract (issue #48)

The **existing** `pilah_evidence` tool now supports `assess_hypothesis`; there is **no fifth public MCP tool**. `record_incident`, `add_hypothesis` and `assess_hypothesis` require **explicit `persist_rca:true`** to store bounded private RCA text. A call to `record_incident` always yields `state:"investigating"`, even with valid evidence IDs; historical `evidence-linked` rows are displayed as *unverified*. The legacy `root_cause` field is **candidate cause text**, never a confirmed claim.

`add_hypothesis` requires `incident_id`, `hypothesis`, `experiment`, `predicted_observation`, `disconfirming_test`, and an exact `expected_criterion_id`. Optional `parent_hypothesis_id` branches a Why chain up to depth 8; optional `plan_id` must match the hypothesis criterion in a fresh, hashed acceptance plan. New hypotheses start `untested`.

`assess_hypothesis` requires `hypothesis_id`, `experiment_outcome` (`supports`, `refutes`, `inconclusive`), `observation`, optional `evidence_ids`, and `persist_rca:true`. For supported/refuted outcomes, every linked evidence record must match the current source revision/workspace and intact artifact hash, a **passing exact named unit/integration assertion**, and the hypothesis criterion. This results only in `locally_supported`, `refuted`, or `inconclusive`; **never independently proven root cause**. Source edits mark outcomes stale, even in Compact.

`hypotheses` can filter by `incident_id`, returning parent/depth, recorded outcome, current freshness and a mandatory causal-proof warning. `incidents` includes candidate cause and `root_cause_verified:false`. Optional recurrence hints contain only prior same-signature incident **IDs**, not a claim that the previous cause applies. Incident/hypothesis notes are retained locally; sanitizers reject common plaintext credential assignments as a heuristic. See [Adaptive 5 Whys](ADAPTIVE_RCA_WORKFLOW.md).

**Risk-guidance contract:** `proposeRiskTests` returns `suggested_test_ids` and `suggested_total`; its legacy `required_test_ids` is now empty because a heuristic cannot impose mandatory acceptance. Compact limits displayed suggestions to 3 while retaining all matched domain/omission counts. Only criteria explicitly added to the user's acceptance plan are mandatory.

### RCA privacy cleanup and Compact evidence freshness

`pilah_evidence(operation="delete_incident")` requires an authorized workspace, existing `incident_id`, `persist_rca:true` and `confirm_deletion:true`. It atomically deletes only the selected incident and its linked hypotheses; existing independent machine evidence and acceptance plans are **not removed**. This is logical deletion, not secure erasure of SQLite WAL/backups. In Compact, `incidents` and `hypotheses` lists show max 8 entries and report `total` / `more_available`, retaining causal-proof warnings. The `hypotheses` read path re-checks source revisions and stored named-test evidence hashes; a previously locally-supported cause becomes **stale** if the linked report was modified or removed.

**RCA experiment audit trail:** `rca_experiments` is an append-only SQLite table for hypothesis outcomes with source revisions, criterion, observation and linked evidence IDs. A hypothesis keeps its current status and returns `recent_experiments` (max 3), `experiments_total` and `more_experiments_available`; older records are not overwritten by newer interpretations. Explicit `delete_incident` also deletes that incident's experiment history, not unrelated evidence.

## P0 native provenance and parser constraints (issue #50–#53)

The native `PostToolUse` hook accepts current `write_file`/`edit_file` operations as well as older file-edit tool names, and normalizes supported `toolCall.args`, `toolArgs`, `toolInput` and `arguments` shapes. It recognizes only **direct, unmasked test commands** when recording success provenance. A shell command merely mentioning a test name, chained test with `|| true`, or `echo "npm test"` cannot re-attest an old passing report. Unknown or suspicious attempts clear positive local provenance; explicit numeric zero exit remains required. This is not cryptographic proof of native execution.

JUnit parsing refuses commented-out testcases, unsupported DTDs, incomplete structure and spurious failure tags inside system logs/CDATA; both single- and double-quoted attributes are accepted. TAP requires exactly one valid numeric `1..N` plan, in-order assertions, and treats `Bail out!` as failed and TODO/SKIP assertions as non-passing. Unsupported reports return inconclusive, never silently passed. This is a **conservative parser**, not a complete XML/TAP specification implementation; external signed acceptance is separate.

The CLI `tokens` absolute workspace argument and `artifacts snapshot|list|diff|show` now use explicit `fs`/`path` imports and a bounded symlink-safe `active-session.json` reader. Cross-platform artifact root falls back to `getHomeDir()`. These local test/CLI fixes have no effect on the independent release gate [#15](https://github.com/alifakbxr/a2a/issues/15).


## v2.0.1 reliability and privacy contract updates (19 November 2026)

- Four public MCP tools remain. `pilah_evidence` includes opt-in Adaptive 5 Whys RCA operations; local hypotheses remain non-causal suggestions unless supported by exact source-bound machine assertions.
- `a2a://status` returns redacted workspace **counts** and booleans only, not host paths or per-project names. `resources/read` errors sanitize authorization failures.
- `hooks.json` recognizes native `write_file`, `edit_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content` tool events; native test evidence rejects indirect or spoofed commands.
- `tools/list` enforces a 6,500-byte serialized contract budget with bounded IDs and criteria. Removed unused `pilah_context.conversation_id`, `pilah_context.transcript_path`, and `pilah_evidence.version_number`; deprecated `allow_stale` never permits PASS.
- Syntax validation recursively covers all source and script `.mjs` files on all CI/runtime-publish gates. `a2a doctor` advises about shell-managed Node version manager paths without executing a shell or changing user configuration.

See [security](SECURITY.md), [compatibility](COMPATIBILITY.md), and [release gate #15](https://github.com/alifakbxr/a2a/issues/15). A2A v2.0.1 is **not** externally certified or authorized for publishing.

## File safety and workspace origin (v2.0.1)

Evidence list/freshness rehashes are bounded to 4 MiB per report. The release manifest is parsed and hashed from one bounded pinned read; independent acceptance registry and trusted keys reject group/world-writable files, symlinks and malformed JSON with sanitized diagnostics. Local side-question records are restricted to their owning workspace. Recursive workspace-file expansion has a visited set and depth bound; IDE SQLite trust-state reads have size/type limits. Relative snapshots are anchored to the approved project root; Antigravity brain artifacts require matching active conversation scope. See [security](SECURITY.md) and [compatibility](COMPATIBILITY.md). These are local safety gates, not proof of external software acceptance.
