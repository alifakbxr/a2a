# Behavioral reliability — evidence-driven Five Whys and remediation

**Scope:** A2A v2.0.1 candidate, derived from a **private** Antigravity behavioral audit covering 110 parseable sessions and 90,407 events, 28 October–18 November 2026. This document contains **sanitized aggregate observations only**. It does not embed source transcripts, private URLs, credentials, customer IDs, or screenshots.

**Method:** An observed failure mode → five explicit causal hypotheses → a bounded A2A mechanism → a falsifiable regression. Five Whys is **causal analysis**, not a claim that every intermediate hypothesis was independently proven. The plugin does not control Google's native browser, model or tools. See #15 for real installed Antigravity and STOCKROOM live acceptance, which automated Node tests cannot replace.

## BA-01 and BA-05 — Completion claims exceed the observed tests (P0)

**Evidence:** Agent claims of completion were followed by user reports of broken behavior in Wedding Planner, Caseverity, UsherApp QR check-in and Mitra. The audit records transitions and timestamps, **not live reproduction of the underlying bugs**.

1. Why was a task described as completed? Some positive signal such as build, a passing testcase, or a screenshot was available.
2. Why did that signal fail to cover reported behavior? Specific negative, dynamic-data, viewport and repeat-flow conditions weren't shown to have been executed.
3. Why weren't all conditions visible? Free-form acceptance descriptions do not identify exact observable transitions and required evidence types.
4. Why was reporting too broad? Named machine reports were mixed with unsupported release/functional claims in narrative summaries.
5. Why wasn't there a reliable boundary? Completion lacked a consistently inspectable, scenario-scoped evidence matrix.

**Root-cause candidate:** missing explicit contract separating implementation, machine assertions, visual/hardware observations and independent acceptance; *not* proof of a single prompt/model bug.

**Fix:** `a2a_verify(operation="plan")` accepts optional structured criteria with `given/when/then`, `evidence_type`, source revision and UI state/viewport/reference. Planning is `not_tested` by default. Assessment returns criterion states and a separate `completion` object with `fully_verified:false` unless authenticated acceptance uses the distinct release path. Named local reports remain **local test assertions only**. For typed browser, visual, security, hardware and independent claims, ordinary local unit/build JSON cannot grant a PASS. Evidence cannot be retroactively promoted by task narrative.

**Regression scenario:** a build-only `passed` testcase offered as proof of a functioning duplicate-check-in printer, Figma hover, dynamic data or offline restart must remain **inconclusive/not_tested** for that higher-level behavior. A genuine named local integration test may pass its own narrow assertion, but never the overall independent completion gate.

## BA-02 — Design parity remains unproved after visual inspection (P1)

**Evidence:** 719 Figma MCP calls, 5,536 DevTools calls and repeated UI mismatch reports; these counts do not identify exactly which states or viewports were executed.

1. Why does the user still see mismatched layout/behavior? An unobserved UI state or viewport may be wrong.
2. Why unobserved? A screenshot or page-load smoke test covers only one moment.
3. Why not caught? State, reference, dimensions, interactions and dynamic content aren't bound to specific checks.
4. Why? Generic test cases do not encode UI observations as structured acceptance.
5. Why? The workflow's default notion of verification is tool activity, not complete behavioral evidence.

**Fix:** Every typed `visual` or `browser` criterion must declare viewport, UI state and design/behavior reference. It cannot be verified by an unrelated build result. Actual screenshots/interactions remain native Antigravity work, with independent evidence gate unchanged.

**Regression scenario:** a successful Vite build offered as proof that a hover button matches a Figma node at 375×812 must return `inconclusive`, not visual parity.

## BA-03 and BA-06 — Native tool churn and low effective A2A adoption (P1)

**Evidence:** 412 indicative invalid argument errors, 150 missing paths, 136 edit mismatches, 64 timeouts, 14 stale browser contexts; 13 directly observed A2A/VerifyKit calls across four sessions. Several events came from earlier plugin versions, not the current candidate.

1. Why repeated failures? Arguments, paths or browser state sometimes become invalid.
2. Why might the next call fail similarly? Agent may retry before refreshing the contract or state.
3. Why isn't recovery deterministic? Timeouts, permission rejection, schema validation and edit conflicts demand different next actions.
4. Why isn't failure easy to classify? Native tools expose varied messages while A2A does not intercept their calls.
5. Why is tool use inefficient? No concise, optional shared triage response for these failure classes.

**Fix:** `a2a_evidence(operation="tool_recovery")` gives bounded and privacy-safe guidance; it **never** runs, retries, modifies or proxies a native tool. Raw error hints aren't persisted or copied into responses. After repeated attempts it explicitly warns against identical retry loops. The tiny always-present rule and optional Always-On guidance remind the agent to check current state and proof scope.

**Regression scenario:** a `-32602` invalid `pageId` error yields schema/state inspection; lost browser execution context yields a fresh page/selector check; `403` yields **stop and request permission**, never bypass. Credential-bearing error text is never echoed.

## BA-04 — Long-session rereads and ambiguous 'continue' (P1)

**Evidence:** 13,379 `read_file` calls, 9,562 repeats of the same (session,path); 111 minimal user follow-ups. Repeated paths can be **correct** after edits. These are *not* counts of objectively wasted tokens.

1. Why repeated inspection? The same files are revisited after long tasks and edits.
2. Why not skip unchanged work? The agent lacks a short, authenticated map of which decisions and tests remain valid.
3. Why unavailable? Human commitments, source revisions and machine evidence are separate.
4. Why ambiguous on continue? Without a persisted status, 'completed' might mean changed but not tested.
5. Why costly? Recovery from entire conversations instead of concise source-fresh checkpoints increases uncertainty.

**Fix:** extend the existing, opt-in `save_checkpoint` with bounded `decisions` and `pending_tests`; on `model_recovery` return `source_freshness` and `verified:false` with the latest full-inventory source revision. Existing stored checkpoints migrate additively; no new memory backend, automatic transcript ingest or third-party component.

**Regression scenario:** record three pending QR states, edit source, call recovery: decisions remain readable but checkpoint is **stale**, and completed notes cannot be accepted as machine evidence.

## BA-07 — Teamwork is not necessarily beneficial (P2)

**Evidence:** About 1,389 observed native teamwork/subagent calls over 82 sessions, but no such calls in the paired STOCKROOM benchmark. Two sessions do not establish the optimum number of workers.

1. Why did some large tasks stay single-agent? Size alone doesn't guarantee delegation should happen.
2. Why might splitting be harmful? Workers may touch overlapping files and share dependencies.
3. Why not caught earlier? Ownership isn't always explicit.
4. Why was a mode suggested? Previous advisor prioritized high-level horizon/workstream counts.
5. Why a productivity risk? Parallel plans can add coordination and verification overhead.

**Fix:** advisor recommends parallel native modes only when **file ownership is explicitly independent** and dependencies low, with a user approval requirement; otherwise use one agent. Hard tightly-coupled reasoning may still receive non-parallel assistance if supported.

**Regression scenario:** overlapping owners or high dependency => `single-agent`; independent owners and confirmed native command => opt-in recommendation only. No swarm is ever launched by A2A.

## BA-08 — Raw transcripts contain confidential information (P0)

**Evidence:** The private audit observed at least one login credential in plaintext. No secrets are included in this document. This is not evidence of A2A outbound data exfiltration.

1. Why sensitive content exists? Users sometimes paste authentication details into prompts.
2. Why could audit output expose it? Raw events or error strings may be copied to public fixtures.
3. Why dangerous? Untrusted model-visible logs can contain credentials, paths and cookies.
4. Why not enough to 'sanitize later'? A public GitHub push is irreversible in common operational workflows.
5. Why protect ingestion by default? Privacy and debug convenience have different trust requirements.

**Fix:** sanitized **synthetic** test fixtures only; no original raw archive in Git; recovery messages never echo native raw errors; explicit checkpoint rejects common plaintext secret assignments. All E2E tests use disposable generated workspaces. Keep raw original private, and rotate exposed active credentials.

**Regression scenario:** `password=...` note rejected, an error containing a token never appears in A2A guidance or GitHub test output.

## Scope of executed verification

- `tests/behavioral_acceptance.test.mjs`: typed criteria, false-completion negative controls, source revision mismatch, checkpoint privacy/freshness, failure triage and teamwork preconditions.
- `tests/behavioral_mcp_e2e.test.mjs`: **real local Node MCP stdio process + SQLite**, with permission denial, four-tool listing, typed planning and assessment, recovery, changed-source invalidation and JSON-RPC schema rejection.
- Other existing Node unit/security/MCP tests and cross-platform CI remain mandatory.

**Important limitations:** local Node/MCP E2E is *not* a real Antigravity installation, Figma screenshot comparison, printer/QR hardware test, Laravel backend, independent STOCKROOM F01–F18 browser/DB acceptance or repeated model benchmark. The live evidence for those remains **open in #15**. A2A cannot force the upstream native agent to follow its advice, guarantee all bugs disappear, or assert token savings from repeated-read counts.

## Re-audit: five subsequent failure modes (19 November 2026)

The subsequent source review opened [#38–#42](https://github.com/alifakbxr/a2a/pull/43). These are **code-confirmed gaps with isolated function reproductions**, not proof of errors in a live installed IDE:

1. **#38 / P0 — Handoff could certify the wrong evidence kind.** Why? Positive named test plus local hook record → handoff omitted evidence-type restrictions → two verification paths diverged → regression only tested ordinary `assess` → no shared local evidence policy. **Remediation:** central `localEvidencePolicy` and positive-provenance restricted-type negative controls.
2. **#39 / P0 — Failed native command could look successful.** Why? PostToolUse lacked a top-level error → command exit code ignored → completion conflated with success → existing report hashes could be reattached → no fail-closed exit contract. **Remediation:** explicit numeric zero exit code required; nonzero/missing/conflicting exit clears positive provenance.
3. **#40 / P1 — Authorization denial could be hidden by a page ID.** Why? Broad `pageid` matched → first regex branch won → caller-specified deny lost → permission guidance suppressed → no severity-aware classification. **Remediation:** denial-first detection, user authorization required.
4. **#41 / P1 — Planned acceptance cases could disappear.** Why? `plan` was transient → `assess` rebuilt scope from its own input → missing cases absent from total → no plan ID → no source-bound immutable manifest. **Remediation:** optional persisted `plan_id`, complete-scope assessment with omissions and stale/tamper detection; explicit user-triggered reissue on the new revision *without reducing the frozen criterion set*; opt-in local retention.
5. **#42 / P2 — Full brain Markdown could be stored without explicit consent.** Why? edit-event hook called snapshot → artifact versioner stored full content → retention was optimized for history → user settings did not distinguish metadata from content → docs were unclear. **Remediation:** automatic content snapshots off by default, opt-in CLI and transparent persistent-data disclosure.

This hardening is tested with synthetic fixtures and local MCP JSON-RPC/SQLite E2E; full Antigravity/browser/QR-printer and external STOCKROOM evaluation remains in [issue #15](https://github.com/alifakbxr/a2a/issues/15). Do not import private transcript archives into public fixtures.

## Release and merge policy

This behavioral work **merged only into `v2.0.1`** via [PR #36](https://github.com/alifakbxr/a2a/pull/36), commit `67ea5888caf61751952c8a7daa1eb222d738d4b6`, and all six code-level issues #30–#35 were closed as **implemented**. Post-merge [GitHub CI](https://github.com/alifakbxr/a2a/actions/runs/44325007116) passed 4/4 OS/runtime jobs with 213/213 tests on Ubuntu Node 22. External #15 remains open. Do not merge to `main`, create a tag, publish an npm package or declare production-readiness without independent acceptance and explicit approval.
