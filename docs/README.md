# PILAH documentation

**Current project:** PILAH v2.1.0 source on [`alifakbxr/a2a`](https://github.com/alifakbxr/a2a). The repository has **not** been renamed on GitHub and `@aliip/pilah` publication is not verified. Node.js >=22.13.0 is required.

Start with the [README](../README.md) for source setup and CLI usage, [build status](../BUILD_STATUS.md) for tested behavior, and [validation backlog](MAIN_VALIDATION_BACKLOG.md) for the outstanding host-run and F01–F18 checks. The four current public tools are `pilah_context`, `pilah_impact`, `pilah_verify`, `pilah_evidence`. Legacy `a2a_*` names remain callable aliases, not recommended usage.

**Evidence boundary:** Passing unit/CI tests does not mean an installed Antigravity host, app/browser behavior, token-saving benchmark, or independently signed release has passed. No public package publication has been authorized.

## Start here

- [Engineering method & Claude Code comparison](ENGINEERING_METHOD.md)
- [MCP tools, arguments and evidence contracts](CONTRACTS.md)
- [Components, data flow and boundaries](ARCHITECTURE.md)
- [When to call PILAH; native-first workflow](NATIVE_FIRST_WORKFLOW.md)
- [Supported stacks, Node and Antigravity environments](COMPATIBILITY.md)
- [Workspace trust, privacy and threat model](SECURITY.md)

## Operations and evidence

- [One-job PR CI, three-job main CI; honest token benchmarking](CI_EFFICIENCY.md)
- [Release checklist and required live tests](RELEASE.md)
- [Signed, fail-closed publication gate](RELEASE_AUTHORIZATION.md)
- [What is not yet independently proven](MAIN_VALIDATION_BACKLOG.md)
- [Evidence and release acceptance criteria](ACCEPTANCE_GATE.md)
- [STOCKROOM F01–F18 independent test runbook](INDEPENDENT_ACCEPTANCE_RUNBOOK.md)
- [Risk-aware test recommendations](RISK_GUIDANCE.md)
- [Browser, semantic and local proof boundaries](SEMANTIC_EVIDENCE.md)
- [Opt-in checkpoints and recovery](CHECKPOINT_RECOVERY.md)
- [Optional native agent teamwork](ORCHESTRATION_ADVISOR.md)
- [Local conversation token diagnostics](CONVERSATION_USAGE.md)
- [What token counts can and cannot establish](TOKEN_PROVENANCE.md)
- [Controlled Native-versus-PILAH evaluation](AB_EVALUATION.md)
- [Observed MCP intervention logging](INTERVENTION_LEDGER.md)

## Historical A2A audits and research — reference only

These dated records explain earlier decisions; they are **not current installation, CI or release instructions**. Some deliberately retain legacy names and outdated branch status as evidence of the original audit.

- [Initial Five Whys review](5-WHYS.md)
- [Earlier Always-On incident analysis](ALWAYS_ON_5_WHYS.md)
- [Adaptive RCA design history](ADAPTIVE_RCA_WORKFLOW.md)
- [Agent decision findings](AGENT_DECISION_REVIEW.md)
- [Historical agent trace evaluation](AGENT_TRACE_BENCHMARK.md)
- [v2.0.1 behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md)
- [Engineering standards research](OPEN_SOURCE_ENGINEERING_STANDARDS.md)
- [Pre-vNext migration and audit](PRE_VNEXT_INTEGRATION.md)
- [Earlier private-export design](PRIVATE_BENCHMARK_EXPORT.md)
- [v2.0.1 security audit](SECURITY_RELIABILITY_AUDIT_V2_0_1.md)
- [Historical research references](SOURCES.md)
- [Frozen source preflight snapshot](STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md)
- [Earlier token-efficiency review](TOKEN_EFFICIENCY.md)
- [v2.0.1 issue/PR provenance](V2_0_1_TRACEABILITY.md)

## Sources of truth

The executable `src/tools.mjs`, `plugin.json`, `mcp_config.json`, `hooks.json`, `schemas/mcp-tools.json` and `schemas/database.sql` supersede historical prose. Publication requires the signed gates in [release authorization](RELEASE_AUTHORIZATION.md). Never commit private conversation transcripts, archived project source or credentials.
