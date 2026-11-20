# A2A Documentation Index

**Current target:** [`v2.0.1`](https://github.com/alifakbxr/a2a/tree/v2.0.1), Node >=22.13.0, four public MCP tools, local-first/native-first. **Status: CI-passing development candidate, not production released.** The version branch contains behavioral reliability [PR #36](https://github.com/alifakbxr/a2a/pull/36). External release acceptance remains open in [#15](https://github.com/alifakbxr/a2a/issues/15).

## Start here

| Purpose | Document |
| --- | --- |
| Intro, setup, modes, examples | [Repository README](../README.md) |
| Implementation and evidence status | [Build status](../BUILD_STATUS.md) |
| MCP actions, criterion schemas, database tables | [Contracts](CONTRACTS.md) |
| Module boundaries, index, evidence flow | [Architecture](ARCHITECTURE.md) |
| Native-first agent behavior and tool minimization | [Workflow](NATIVE_FIRST_WORKFLOW.md) |
| Checkpoints and recovery after failure | [Checkpoint & recovery](CHECKPOINT_RECOVERY.md) |
| Agent behavior findings, 5 Whys, regressions | [Behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md) |
| Native-first adaptive diagnosis and falsifiable RCA experiments | [Adaptive 5 Whys workflow](ADAPTIVE_RCA_WORKFLOW.md) |
| Workspace safety and local privacy | [Security](SECURITY.md) |
| Compatibility of stacks/Antigravity surfaces | [Compatibility](COMPATIBILITY.md) |

## Verification and benchmark

| Question | Document |
| --- | --- |
| What test coverage should A2A suggest? | [Risk guidance](RISK_GUIDANCE.md) |
| What do local browser/semantic reports prove? | [Semantic and browser evidence](SEMANTIC_EVIDENCE.md) |
| How is independent evidence checked? | [Acceptance gate](ACCEPTANCE_GATE.md) |
| How to execute actual external F01–F18? | [Independent runbook](INDEPENDENT_ACCEPTANCE_RUNBOOK.md) |
| What happened with the frozen baseline archives? | [STOCKROOM preflight](STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md) |
| How are A/B and token metrics interpreted? | [A/B evaluation](AB_EVALUATION.md) · [Token efficiency](TOKEN_EFFICIENCY.md) · [Token provenance](TOKEN_PROVENANCE.md) · [Conversation history](CONVERSATION_USAGE.md) |
| What do observable agent traces indicate? | [Trace comparison](AGENT_TRACE_BENCHMARK.md) · [Decision review](AGENT_DECISION_REVIEW.md) · [Intervention ledger](INTERVENTION_LEDGER.md) · [Private export](PRIVATE_BENCHMARK_EXPORT.md) |

## Operations and release

| Subject | Document |
| --- | --- |
| Current release engineering | [Release](RELEASE.md) |
| Fail-closed signed publish gate | [Release authorization](RELEASE_AUTHORIZATION.md) |
| Version branch provenance and acceptance checklist | [v2.0.1 traceability](V2_0_1_TRACEABILITY.md) |
| Opt-in native subagent/teamwork advice | [Orchestration](ORCHESTRATION_ADVISOR.md) |
| Evidence-guided maintenance conventions | [Open-source engineering standards](OPEN_SOURCE_ENGINEERING_STANDARDS.md) |
| Original integration history | [Pre-vNext historical audit](PRE_VNEXT_INTEGRATION.md) |
| Earlier plugin incident/root-cause analysis | [Foundational Five Whys](5-WHYS.md) · [Always-On Five Whys](ALWAYS_ON_5_WHYS.md) · [Security and reliability audit](SECURITY_RELIABILITY_AUDIT_V2_0_1.md) |
| External research sources (documentation-only) | [Sources](SOURCES.md) |

## Sources of truth and terminology

1. **Executable contracts:** `src/tools.mjs`, generated `schemas/mcp-tools.json`, `schemas/database.sql`, `plugin.json`, `hooks.json`. This index links to explanatory documentation; code wins if they conflict.
2. **Implementation evidence:** merged [PR #36](https://github.com/alifakbxr/a2a/pull/36) and cross-platform [post-merge CI](https://github.com/alifakbxr/a2a/actions/runs/44325007116). Automated Node MCP E2E is **not** an installed Antigravity acceptance test.
3. **Local test result:** named JUnit/TAP/JSON assertions are not independent proof of business/visual behavior. Planning is not testing; `completion.fully_verified` is deliberately false for local reports.
4. **Real release eligibility:** actual external test runner observations, frozen F01–F18 criteria, independent signatures, matched repeated benchmark and human approval. **Unfulfilled**.
5. **Historical docs:** some preserve earlier PR numbers or observed pre-fix behavior for traceability; do not use those as installation/operation instructions over current contracts.

Do not upload private user transcripts, credential-containing logs, or frozen application archives to this public repository.

**20 Nov 2026 engineering audit:** P0 release signatures and Git execution boundary, malformed JUnit, source/report provenance, session/trust boundaries and protected workspace diagnostics have been corrected in merged PRs #81–#85; PR #86 improves safe MCP intervention measurement and plugin skill-exclusion diagnostics; PR #88 adds PreToolUse reporter correlation. Combined 9-job CI [passed](https://github.com/alifakbxr/a2a/actions/runs/44706443191). Live agent selection #71 and independent release acceptance #15 are **still open**; do not promote this branch.
