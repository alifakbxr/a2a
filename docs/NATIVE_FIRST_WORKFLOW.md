# A2A Native-First Workflow — v2.0.1 candidate

**Status:** workflow contract for the `v2.0.1` branch. This document is not evidence of external benchmark acceptance or production readiness. **No third-party runtime integration whatsoever:** only A2A and native Antigravity capabilities; external projects may be cited as research but are never installed, loaded, or invoked.

## Purpose and non-goals

A2A augments Antigravity with **scoped project context, risk-aware test planning, evidence accounting, and transparent diagnostics**. Antigravity remains responsible for reasoning, editing, commands, browsers, permissions and any native subagents. A2A must not install extra agents/skills/MCP servers, launch browsers/workers, execute arbitrary project commands, silently trust a workspace, or send source data to external services.

The intended change is **when and how to use existing capabilities**, not adding more tools or default token consumption. Keep exactly four public MCP tools: `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence`. Default to on-demand. Always-on remains opt-in and must retain the early-exit decisions below.

## One-screen decision table

| Situation | A2A calls | Antigravity responsibility |
| --- | --- | --- |
| Readme, styling, simple isolated edit, or question native tools already answer | **Zero** | Solve directly; do not invoke A2A to justify a trivial change |
| Unfamiliar symbol or cross-file ownership | At most one `a2a_context(action="query")` *or* one `a2a_impact(summary=true)` | Inspect exact source only when implementing |
| High-risk cross-module change | One `a2a_impact(summary=true)`; one `a2a_verify(operation="plan")` if an actual test plan is needed | Define negative controls before editing; use existing native test runner |
| Security, tenant, finance, inventory, concurrency, offline, auth or other stateful mutation | High-risk path **plus** domain-specific independent acceptance criteria | Implement, run negative and concurrency tests, inspect backend state; report unavailable tests as not-run |
| Browser/UI behavior | Define typed `a2a_verify(plan)` scenarios with viewport, UI state and reference. Use `assess_browser` only for an actual browser report | Native Antigravity must exercise real interactions, dynamic states, responsive widths and failing paths; a build does not prove visual parity |
| Test report / worker handoff | `assess` or `verify_handoff` **once** for named machine evidence | Execute native tests; never treat test names or broad suite pass as proof of untested scenarios |
| Final release decision | `assess_release` **only after** version-source, evidence-revision, scope, trust-key and semantic blockers are fixed and externally attested | Independent evaluator uses a frozen external acceptance registry and a separate signing key |
| Historic token accounting, incidents, audit trail | On explicit request, use `a2a_context(action="tokens")` or `a2a_evidence` | Reconcile official usage when available; distinguish cache/unknown worker overlap |

## Execution protocol

1. **Classify the task and exit early.** If the native agent can finish without meaningful project-wide risk, use no A2A calls. No automatic repetitive token reports, forced post-processing, or decorative verdicts.
2. **Scope only what changed.** Prefer the user's current task, changed files and the repository's existing tests. Call `a2a_impact` at most once for a scoped high-risk pass; fetch fuller graph detail only when the bounded summary cannot answer a specific question. Treat missing dependencies/tests as **unknown**, never proof of safety.
3. **Freeze actual acceptance criteria before implementation** on high-risk tasks. For typed `a2a_verify(operation="plan")` scenarios specify `id`, `given`, `when`, `then`, `evidence_type` and negative paths; UI/browser criteria additionally require `viewport`, `ui_state` and `reference`. Every planned criterion starts **not_tested**. Include role/tenant boundaries, server-authoritative totals, duplicate refund, true concurrency, offline browser **process** restart and idempotency when applicable.
4. **Implement using native Antigravity.** The IDE handles source edits, terminal commands, browser interaction and approvals. Reuse existing tests instead of generating duplicate runners. Parallel native Teamwork/Swarm/subagent recommendations require confirmed command availability, **low dependencies and explicitly independent file ownership**, and user consent. Single-agent remains the safe default. No invented command availability.
5. **Verify at the right level.** Run actual unit/integration/E2E tests with native permissions, then call A2A assessment only where machine evidence exists. Local assessment returns `completion.fully_verified:false`, even when named test assertions pass. `assess` proves the scope of named tests only. `assess_semantic` and `assess_browser` are **unattested structural reviews**, never independent security or release approval. Browser evidence must bind source revision, build identity, execution timestamp and explicit assertions; screenshots or passing test names alone do not prove behavior.
6. **Challenge failure modes.** For risky work, deliberately test forbidden routes and background replay, altered IDs, partial payments/refunds, overlapping transactions, persisted offline queue and backend reconciliation, stale builds and no-data cases. If the independent test cannot be run, mark **not-tested**, not passed.
7. **Give a concise human handoff.** State `passed / failed / partial / not-tested / stale` for the **specific tested scope**, unresolved blockers and exact follow-up. Do not infer token savings or causal impact from one run, native worker count, weekly allowance percentage or locally summed cache categories.

## Follow-up fixes on v2.0.1

The five code-level findings from the follow-up audit have now been addressed directly on `v2.0.1`, with regression coverage and **no new third-party dependencies**:

- **AUD-01 P0:** Recognized generated A2A JSON evidence under `report/`, `reports/`, or `test-results/` no longer enters the source fingerprint; report bytes are separately hashed. Ordinary JSON source still changes the revision. Other report locations remain source-indexed.
- **AUD-02 P1:** CLI and MCP expose the version from `package.json`, with a live protocol/CLI version contract test against `plugin.json`.
- **AUD-03 P1:** Built-in semantic capabilities are mandatory minimum checks; caller-selected checks are additive.
- **AUD-04 P2:** Benchmark evaluator is explicitly source-checkout-only, with a package distribution contract.
- **AUD-05 P2:** Intervention ledger associates events through precomputed indices instead of repeated linear tail searches; results after a new planner turn are not misattributed to the previous turn.

These fixes close **local code-level gaps only**. They do not establish independent execution provenance, release readiness, or a causal token/performance improvement. Observe the latest cross-platform CI at the current branch head before treating them as validated.

**The `v2.0.1 → main` release gate remains blocked** until the frozen STOCKROOM F01–F18 scenarios undergo actual isolated HTTP/browser/database execution, real Antigravity MCP/browser smoke testing, and comparable repeated A/B trials. External acceptance is tracked in [issue #15](https://github.com/alifakbxr/a2a/issues/15).

## External research is only reference material

- The A2A plugin **does not invoke or depend on any third-party skill, library, Chrome MCP server, coding agent, formatter, or new runtime**. There are no runtime network requests for research documents.
- Modern web compatibility, accessibility, usability and performance *principles* may inform A2A's on-demand test plans, but actual checks remain native Antigravity commands/browser with existing permissions.
- Open-source maintainers' practices (Taylor Otwell/Laravel, Vue core, SQLite, Sindre Sorhus, Kent C. Dodds and Rails) are distilled into [internal maintainer rules](./OPEN_SOURCE_ENGINEERING_STANDARDS.md): minimal targeted diffs, regression-first, existing style, user-visible contracts and explicit maintenance cost.
- These internal rules appear as a **small, not-reviewed `maintainer_review` checklist only for risky verify plans**. They do not call another MCP tool, automatically review code, pass a release gate, or force other developers' language style on a different repository.
- The list of scholarly/public sources is documentation-only. Never auto-install or ask the user to connect external tools because a source is cited.

## Workflow quality checks

For a future validation run, confirm:
- A trivial task causes **zero** A2A MCP calls; a high-risk task normally requires no more than one scoped impact pass and one verification plan before native execution.
- User approval is required before paid/parallel workers and any external integration installation.
- All four public MCP tools remain present; native permissions and errors remain unchanged.
- Sequential checkout tests cannot count as real concurrency; tab refresh cannot count as full process restart; signed but incomplete acceptance scope cannot qualify for release.
- JSON evidence does not change the **source** revision, while real source changes invalidate evidence, **using recognized generated-report paths and confirmed independent evidence integrity**.
- Official usage, local counters, worker overlap and A2A report size remain distinguished, and unfinished runs stay unfinished.
- Native vs. A2A comparisons use matched environments and independent acceptance: optimizing prompt/tool call counts alone is **not** success.

The workflow specification documents intended behavior; actual compliance must be tested with native Antigravity sessions and adversarial fixtures.

## Behavioral reliability update — merged PR #36 (18 November 2026)

The user-history behavioral audit produced issues [#30–#35](https://github.com/alifakbxr/a2a/pull/36) and a **merged** implementation on `v2.0.1`. New capabilities remain within the four public tools:

- **Truthful completion:** typed Given/When/Then negative-control scenarios and explicit evidence types; browser/visual criteria require state/viewport/reference; ordinary local test reports cannot claim independent visual/security/hardware PASS.
- **Context and decisions:** optional `a2a_evidence(operation="save_checkpoint")` stores bounded explicit `decisions` and `pending_tests`. `model_recovery` reports whether the checkpoint's source revision is stale; completed notes remain unverified.
- **Native tool recovery:** `a2a_evidence(operation="tool_recovery")` gives privacy-safe guidance for invalid arguments, stale browser contexts, timeouts, denied access, missing paths and edit conflicts. It **never intercepts native tools** or executes retries.
- **Teamwork ownership:** recommend parallel modes only for confirmed supported commands, low dependency and independently owned files; user approval remains required.
- **Privacy:** no raw Antigravity archives are added to the public repository; raw tool errors are never echoed from the recovery helper.

**Measured scope:** [post-merge CI](https://github.com/alifakbxr/a2a/actions/runs/44325007116) passed 4/4 platforms with 213/213 Node tests on Ubuntu Node 22, including **real local MCP stdio/SQLite E2E**. This is **not** live Antigravity/Figma/printer or real STOCKROOM F01–F18 validation. Independent external evidence remains open in [issue #15](https://github.com/alifakbxr/a2a/issues/15). See [Behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md).

## Fast-path low-token workflow (issue #44)

1. **No A2A for simple/native-solvable tasks**, including isolated changes with enough context. Default `On-Demand` injects no session policy. Do not invent mandatory A2A calls.
2. **One targeted tool for a material question:** choose `a2a_context(action="query",query="...",limit=5)` **or** `a2a_impact(changed=[...],summary=true)`; prefer actual changed paths and reuse the answer until source/scope changes. Do not blindly chain inspect, query, skeleton and impact.
3. For behavioral risk, use scoped `a2a_verify` only when Given/When/Then and real native tests are needed; `persist_plan:true` stores user-authored scenarios only with explicit permission. Source changes invalidate earlier evidence.
4. Default **Compact** caps skeleton to 4,800 total characters/1,600 per file/six previews and query graph relations to 12 with explicit truncation. Use native source reads or `compact off` for complete evidence as needed, rather than treating previews as a substitute.
5. Report **what was tested** and remaining unknowns, without repeated token footers. Static prompt/payload reductions do not measure true model usage. Benchmark with official usage and independent quality gates.

## Adaptive RCA branch — no mandatory five-tool chain

For a **simple/known** bug, use native debugging and regression with **zero RCA tool calls**. For unclear symptoms, perform RCA-lite in native reasoning: expected versus actual, 1–2 competing causal explanations, a falsifier for each, and one discriminating experiment. Escalate to RCA-deep for recurrent/regressed, high-risk, multi-module or user-disputed completion cases; one A2A context OR impact call is optional when it reduces uncertainty. Native Antigravity performs experiments, source edits and browser/database/hardware testing. Opt-in `a2a_evidence` saves hypotheses and outcomes only on explicit `persist_rca:true`; bind each conclusion to the exact named test/source revision, never to a build or unrelated evidence ID. Use a fresh acceptance plan and rerun native tests after source changes. Do **not** require five Why questions or proxy any agent action. [Detailed protocol](ADAPTIVE_RCA_WORKFLOW.md).


### Explicit lightweight routing contract (issue #92)

`scripts/a2a.mjs route` implements an isolated deterministic decision table with profiles `economy`, `balanced` and `deep-review`. Input task/risk/uncertainty is **caller-declared**, not verified by a model. Every output is advisory only; no automatic calls, agent launches, model switches or provider token claims are performed. It chooses native-only for simple tasks in every profile and permits at most one proposed scoped operation when uncertainty or high-risk independent planning justifies it. Profile benefit remains a **research hypothesis** until repeated controlled A/B acceptance proves it.
