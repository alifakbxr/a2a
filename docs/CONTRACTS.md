# A2A Contracts and Data Dictionary — v2.0.1 candidate

**Executable source of truth:** [`src/tools.mjs`](../src/tools.mjs), [generated MCP schema](../schemas/mcp-tools.json), [SQLite DDL](../schemas/database.sql), [plugin manifest](../plugin.json), [hooks](../hooks.json). Current contracts supersede historical examples in earlier audit notes. Documentation is not an executable verifier.

## MCP surface

Four public, JSON-RPC 2.0 **stdio** tools. Every tool requires an **authorized absolute `workspace`**. Legacy `verifykit_*` aliases remain callable, but `tools/list` only exposes them when `A2A_LEGACY_TOOL_ALIASES=1`.

| MCP tool | `action` / `operation` | Meaning |
| --- | --- | --- |
| `a2a_context` | `inspect`, `query`, `freshness`, `tokens`, `skeleton`, `orchestration` | Code inventory, static graph, tokens, declared native teamwork advisor |
| `a2a_impact` | `changed`, `depth` (1–4), `summary` | Bounded static change-impact analysis; uncertainty remains |
| `a2a_verify` | `plan`, `assess`, `verify_handoff`, `assess_release`, `assess_semantic`, `assess_browser` | Test planning, scoped local machine results, independent signed release assessment |
| `a2a_evidence` | `list`, `runs`, `incidents`, `record_incident`, `add_hypothesis`, `hypotheses`, `side_questions`, `record_side_question`, `artifact_versions`, `artifact_diff`, `snapshot_artifact`, `save_checkpoint`, `model_recovery`, `tool_recovery` | Revision-bound evidence, incident hypotheses, explicit checkpoints, bounded recovery guidance |

The public operation enums above reflect current `src/tools.mjs`. Additional engine-internal compatibility aliases may exist but are not guaranteed as public input enums. A2A cannot launch native commands, edit project source, run browsers, force model selection or guarantee upstream agent obedience.

### Verification plan: typed acceptance

`a2a_verify(operation="plan",criteria=[...])` accepts up to 40 strings (legacy) or objects. **Typed** criteria include:

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

`a2a_evidence(operation="tool_recovery")` accepts `tool_family` (mcp/browser/filesystem/terminal/other), optional `error_hint` (<=400 chars; avoid secrets), `error_class` (invalid_arguments/context_lost/timeout/permission_denied/missing_file/edit_conflict/unknown) and `retry_count` (0–20). It returns deterministic **guidance only**, `automatic_execution:false`, `retry_same_input:false`, and never copies or stores the raw hint. Native state/schema refresh is required before a changed retry; permission denial requires user consent.

### Explicit checkpoint and resume

`a2a_evidence(operation="save_checkpoint")` uses `conversation_id`, `task_summary` (1–500 chars), up to eight bounded `completed`, `next_steps`, `decisions` and `pending_tests` notes (<=200 chars each). It rejects recognizable plaintext secret assignments and records the **source revision**, not a verified result. `model_recovery` returns source freshness, notes and a `verified:false` warning; changed source makes an older checkpoint stale. Nothing resumes or switches a model automatically. This is distinct from the read-only headless stream checkpoint CLI in [checkpoint recovery](CHECKPOINT_RECOVERY.md).

### Native teamwork

`a2a_context(action="orchestration",task=...)` accepts user-declared tier, available native commands, workstreams, dependencies, milestones, long horizon, hard reasoning and `file_ownership` (`independent`/`shared`/`unknown`). Parallel modes require **independent ownership and low dependencies** plus confirmed command availability. A2A never creates workers and always requires user approval.

## MCP resources

| URI | Meaning |
| --- | --- |
| `a2a://status` | Local plugin version, active mode/compact/auto-trust, authorized workspaces |
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

- `node >=22.13.0` and built-in `node:sqlite`, with no third-party runtime package dependencies.
- Local JSON-RPC messages are bounded; tool responses larger than **64 KiB** are rejected, not silently truncated into a false complete verdict. Reduce requested scope.
- Workspace authorization, protected roots, symlink checks and explicit revocation take precedence over convenience. Hooks only record limited local metadata; there is **no `PreInvocation`** hook.
- No third-party browser, runtime model API, prompt content upload or remote A2A telemetry.

For actual error behavior and constraints, consult the executable [MCP server](../src/mcp.mjs), [verification](../src/verification.mjs), [acceptance matrix](../src/acceptance-matrix.mjs), [model recovery](../src/model-recovery.mjs), and [native recovery](../src/native-tool-recovery.mjs).
