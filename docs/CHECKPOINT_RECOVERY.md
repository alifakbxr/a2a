# PILAH Checkpoints and Recovery — current v2.0.1 contract

PILAH has **two separate recovery mechanisms**. Neither automatically resumes a model, selects a quota group, launches a native tool or proves task completion.

## 1. Explicit workspace checkpoint via MCP

Use `pilah_evidence(operation="save_checkpoint")` with an authorized workspace and a concrete conversation ID. This stores bounded explicit notes in private local SQLite.

```json
{
  "workspace": "/authorized/project",
  "operation": "save_checkpoint",
  "conversation_id": "conv-test-1234",
  "task_summary": "Fix duplicate QR printing",
  "completed": ["Changed the QR handler, not yet accepted"],
  "decisions": ["Second scan must not create a second print job"],
  "pending_tests": ["All features enabled", "Selfie only", "Verification only"],
  "next_steps": ["Run actual repeat-scan tests on the target printer"]
}
```

`task_summary` is <=500 characters. Each of the four arrays has up to eight nonempty statements of <=200 characters. These are **user/agent-supplied notes**, not attested results; `verified` remains `false`. Recognizable plaintext password/API key/token/cookie assignments are rejected, but the filter is a defense-in-depth heuristic, **not a guarantee** that every secret format will be detected. Never store credentials.

Call `pilah_evidence(operation="model_recovery",conversation_id="conv-test-1234")` to inspect an existing checkpoint. The response includes `source_revision`, `source_revision_matches` and `source_freshness`. If code changes, old notes remain readable but become **stale**; re-read code and rerun tests before continuing.

When Antigravity provides model invocation/stop metadata through supported hooks, PILAH records only sanitized failure category and bounded model name, **not** raw provider errors or credentials. Error classifications are heuristic, not a quota API.

## 2. Native tool recovery guidance (no interception)

Use `pilah_evidence(operation="tool_recovery")` after a native browser, MCP, filesystem or terminal error *only when useful*:

```json
{
  "workspace": "/authorized/project",
  "operation": "tool_recovery",
  "tool_family": "browser",
  "error_class": "context_lost",
  "retry_count": 2
}
```

Optional `error_hint` (max 400 chars) is classified heuristically but **never stored or echoed**. Prefer an `error_class` rather than including a potentially private raw message. Categories:

| Category | Safe next step |
| --- | --- |
| `invalid_arguments` | Inspect exact tool schema and required argument names |
| `context_lost` | Refresh browser page list/current execution context and selectors |
| `timeout` | Verify whether the previous action already took effect, respect backoff |
| `permission_denied` | Stop and obtain explicit authorized access; never bypass |
| `missing_file` | Inspect current project tree and confirm the authorized path exists |
| `edit_conflict` | Reopen changed file, recompute patch and rerun related tests |
| `unknown` | Inspect native diagnostics; do not retry blindly |

PILAH returns `automatic_execution:false` and `retry_same_input:false`; repeated attempts trigger escalation guidance. The agent is free to ignore advice, and PILAH is **not** a native tool proxy.

## 3. Read-only checkpoint from an Antigravity CLI event stream

For an already captured, local headless stream:

```bash
node scripts/checkpoint.mjs agy-stream.jsonl scenario-evidence.json
```

Input status example:

```json
{"scenarios":[
  {"id":"online-checkout","status":"passed","evidence_ref":"ci/run-2"},
  {"id":"offline-restart","status":"not-tested"},
  {"id":"inventory-cross-tenant","status":"blocked","reason_code":"missing-harness"}
]}
```

The utility classifies incomplete steps and reported scenario statuses, but does **not** verify caller-provided source or served-build revisions. It distinguishes `reported_passed` from `verified_passed` (default **0** without an external verifier). Missing results are unknown/incomplete, not proof of quota exhaustion. A validated `agy --conversation ID` may be **suggested**, never run automatically.

Store raw headless event streams only in a private location. Do not publish cookies, prompts, authentication details, complete user logs or internal browser profiles.

## Re-audit note: checkpoint versus acceptance plan

A task checkpoint holds **unverified** decisions and pending tests; it is not a frozen acceptance manifest. For optional complete-scope assessment use `pilah_verify(plan,persist_plan:true)` and pass its `plan_id` to `pilah_verify(assess)`. The plan is persisted only by explicit request and is bound to the source revision. `model_recovery` notes remain separate and never count as a passing test.

## What this does not prove

An opt-in checkpoint, a locally passing named test, and a stream-derived reported pass are different evidence classes. None establishes independent HTTP/browser/DB behavior, end-user visual parity, F01–F18 STOCKROOM acceptance, or publication eligibility.

See [MCP contracts](CONTRACTS.md), [workflow](NATIVE_FIRST_WORKFLOW.md), [behavioral root causes](BEHAVIORAL_5_WHYS_V2_0_1.md), and release #15.
