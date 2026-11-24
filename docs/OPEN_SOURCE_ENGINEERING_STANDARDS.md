# Open-source engineering principles adopted in PILAH

**Scope:** Research-backed coding and review discipline, not imitation of any maintainer's personal style. **PILAH-only implementation:** no new third-party packages, plugins, MCP servers, agents, style frameworks, browser engines, or background services. Antigravity's existing native editor, terminal, test runner, browser and available agent features remain the only execution layer.

## What the primary sources actually establish

| Project or maintainer | Source-backed practice | PILAH adaptation | Not copied |
| --- | --- | --- | --- |
| **Taylor Otwell / Laravel** | Maintainer weighs feature value against added code and long-term breaking/maintenance risk; Laravel contributions separate bugs, compatible features and breaking changes; established style should not crowd out behavioral review | Favor the smallest worthwhile change, preserve public APIs and existing behavior, reject unrelated abstractions, evaluate benefit vs maintenance cost **before** proposing extra automation | Laravel-specific PHP conventions, facades or automatic StyleCI integration |
| **Evan You / Vue core** | API-changing features need design discussion; fixes avoid unrelated style-only refactors, and performance/size costs matter | Require explicit approval/design discussion for large PILAH MCP surface or schema changes; stick to one focused bug, scoped tests and a performance/response-size check | Vue component style imposed on arbitrary repositories or an extra Vue toolchain |
| **D. Richard Hipp / SQLite project** | Bugs need reproducible failing tests; code should blend into existing conventions; requirements map to test cases, and checklists are used for releases; no extraneous dependencies in submitted code | Failing regression first, scenario/revision → named test evidence, negative tests and structured release checklist; no dependencies added | SQLite's C-specific indentation/line-length rules or its private test harness |
| **Sindre Sorhus** | Small focused modules contain complexity; number of lines alone is not the measure of quality | Keep PILAH functions cohesive, deterministic, independently testable, with clear input/output contracts; **reuse PILAH's own internal modules**, not external npm packages | His npm micro-package dependency model (explicitly disallowed here) |
| **Kent C. Dodds** | Test observable consumer behavior, not private implementation details; such tests avoid false positives and fragile refactors | Assert MCP/CLI behavior and adverse user-facing outcomes, not just internal function names or passing test counts | React Testing Library or any extra testing library |
| **Ruby on Rails contributors** | Focused fixes, failing tests, changed documentation, component-scoped testing and performance measurements when relevant | Use the native test runner on affected modules first, full repository CI before promotion, and targeted performance benchmarks for performance-changing edits | Rails/Ruby tooling or stylistic rules |

Primary sources (consulted 2026-11-18):
- Taylor Otwell interview: https://leanpub.com/podcasts/leanpub/taylor-otwell-30-08-18
- Laravel contribution guide: https://laravel.com/framework/docs/13.x/contributions
- Vue contributor guide: https://github.com/vuejs/core/blob/main/.github/contributing.md
- SQLite contributor guide: https://github.com/sqlite/sqlite/blob/master/AGENTS.md
- SQLite quality / requirements mapping: https://www.sqlite.org/qmplan.html
- Sindre Sorhus, Small Focused Modules: https://sindresorhus.com/blog/small-focused-modules
- Kent C. Dodds, Testing Implementation Details: https://kentcdodds.com/blog/testing-implementation-details
- Rails contributing guide: https://guides.rubyonrails.org/contributing_to_ruby_on_rails.html

These are sources of **ideas**. PILAH does not import, fetch, execute or install anything from the cited projects at runtime.

## PILAH's own maintainer standard (v2.0.1)

### Before coding
1. Confirm the existing behavior, user outcome and expected/actual failure. Reproduce a reported defect with a **failing regression test** whenever feasible.
2. Identify the relevant existing project conventions and public interface. Prefer minimal changes. Do not run a large refactor, rename or add abstraction unrelated to the task.
3. Specify negative controls for trust boundaries: authorization, money/ledger, concurrency, repeated requests, stale state and account switching **only where applicable**. For UI issues, identify visible user behavior, keyboard accessibility and observed layout correctness.
4. Check if a new feature/API is worth its cost: maintenance burden, tokens/context, backward compatibility, runtime performance and test burden. Keep four MCP public tools. Reject redundant orchestration/browser adapters.

### While coding
5. Extend PILAH's existing functions/modules and Node built-ins; **zero added third-party dependencies**. Favor small cohesive functions and explicit contracts without fragmenting into pointless one-line modules.
6. Reuse native Antigravity commands and permissions; no implicit tool execution or auto-enabling workers. Fail closed on absent evidence, invalid revision, unauthorized workspace and missing acceptance scenarios.
7. Match **the target repository's own style**, not Taylor Otwell's PHP formatting or Vue/Rails/SQLite naming on foreign codebases. No mandatory cross-language formatting engine.

### After coding
8. Run the narrow failing test then affected suites, release contracts and cross-platform CI. Validate observable MCP/CLI behavior (including structured errors and invalid input), not just source internals.
9. Record source revision, served/build identity, evaluator, test scope and explicit passed/failed/partial/not-tested. Signed statements are not a substitute for actual independent test execution.
10. Preserve concise, reviewable PRs. If there are deliberate performance changes, compare representative workloads and bounded context-token/latency overhead. Do not report improvements without measurements.
11. Do not promote `v2.0.1` to `main` until the separate external acceptance in issue #15 is finished and the user approves.

## Built-in implementation: no extra tool call

The existing `pilah_verify(operation="plan")` response may include **one compact `maintainer_review` checklist** when the actual changed scope/risk is high. It is a suggestion marked **not-reviewed**; it does not run tests or grant release approval. Low-risk/trivial changes keep the existing zero-call or minimal-output workflow.

PILAH must not advertise this checklist as automatically verifying coding quality. The actual indicators are: smaller justified diff, a regression test that fails on broken behavior and passes after the fix, existing API compatibility, no accidental data leak, and external acceptance when relevant.

## Quality and token budget

- **Zero** PILAH MCP calls when Antigravity already has the answer for a trivial task.
- At most **one** scoped `pilah_impact` pass plus **one** `pilah_verify plan` when they meaningfully improve a high-risk task (manual exceptions justified by specific new evidence).
- Keep maintainer guidance bounded, do not inject the whole research document into model context, and never append automatic token reports.
- Avoid treating module count, test count, lines of code or tool calls as quality. Value comes from correct user-visible behavior and independently verified constraints.

## Behavioral acceptance refinement (merged PR #36)

The actual v2.0.1 verifier now supports **Given/When/Then** per-criterion acceptance, explicit required evidence type and UI state/viewport/reference. This extends the minimal-diff and regression-first review discipline; it does **not** make PILAH an automated coding-quality reviewer. Ordinary local test assertions never imply independently verified end-to-end behavior. For long-running tasks, preserve concise explicit decisions and untested scenarios in revision-bound checkpoints, then revalidate after edits. See [current contracts](CONTRACTS.md) and [Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md).
