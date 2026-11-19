# A2A Build and Validation Status — v2.0.1 candidate

**As of 18 November 2026.** This tracks the implementation branch, **not** a production-release certificate.

| Area | Recorded result | Boundary |
| --- | --- | --- |
| Branch | `v2.0.1` @ `67ea5888caf61751952c8a7daa1eb222d738d4b6` | PR [#36](https://github.com/alifakbxr/a2a/pull/36) merged here, not into `main` |
| Automated tests | **213/213 passed**, Ubuntu Node 22 | [Post-merge CI run](https://github.com/alifakbxr/a2a/actions/runs/44325007116) |
| Cross-platform CI | **4/4 successful** | Ubuntu Node 22/24, macOS Node 22, Windows Node 22 |
| MCP E2E | **Passed in CI** | Real local Node subprocess, JSON-RPC/stdio, temporary SQLite and workspace authorization; **not** a live installed Antigravity IDE |
| Implementation issues | **#30–#35 closed** | Behavioral reliability code-level scope only |
| External acceptance | **Not completed** | Issue [#15](https://github.com/alifakbxr/a2a/issues/15) remains open |
| Release | **NO-GO** | No merge to `main`, version tag, npm publication or GitHub Release of the candidate |

## Implemented, covered by repository tests

- Antigravity plugin manifest, MCP stdio interface, `SessionStart` and targeted `PostToolUse` hooks (**no `PreInvocation`**), a bounded permanent rule and opt-in Always-On guidance.
- Four public tools: `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence`. Legacy aliases optional.
- Local SQLite `node:sqlite` source inventory, source fingerprints, incremental index and impact heuristics; transparent limits and missing coverage.
- Protected workspace roots, explicit grant/revocation precedence, bounded settings, symlink/path protections and fail-closed release workflow.
- JUnit/TAP/JSON named assertions; typed Given/When/Then plans with negative cases, evidence type, source revision and UI-specific state/viewport/reference. **No local report can independently verify full completion.**
- Local-only browser/semantic evidence parsing with **unattested** provenance. Signed external acceptance and second reviewer approval are separate.
- Source-fresh model/checkpoint recovery (explicit decisions, pending tests, secret-assignment rejection), bounded native tool failure advice without interception or execution.
- Opt-in teamwork advisor requires explicit low coupling and independent file ownership. No automatic workers or additional runtime dependencies.
- Privacy-preserving telemetry for historic conversations; no fabricated token savings. Optional `a2a stats` calls remote GitHub APIs via the user's installed `gh` CLI only when explicitly requested; clone traffic is not a verified installation metric.

## Follow-up re-audit (19 November 2026)

[PR #43](https://github.com/alifakbxr/a2a/pull/43) addresses five new re-audit issues #38–#42: typed evidence scope in handoffs, fail-closed native process exit provenance, safety-prioritized permission errors, optional immutable acceptance manifests, and **default-off** automatic full brain Markdown content retention. The earlier **213/213** and **218/218** CI counts are historical, **not** test results for these new changes; assess the exact PR and merged-commit runs separately. The code still does **not** independently prove installed Antigravity, Figma, printer, real STOCKROOM F01–F18 or provider-token savings.

## Node 24/26 LTS compatibility validation (19 November 2026)

[PR #47](https://github.com/alifakbxr/a2a/pull/47) extends the runtime CI matrix from four to **nine** jobs: Node 22, Node 24 and exact **Node 26.13.1** on Ubuntu, macOS and Windows. The first nine-job PR run ([Actions 44462198522](https://github.com/alifakbxr/a2a/actions/runs/44462198522)) **passed all nine**, including **232/232 tests on Ubuntu Node 26.13.1**. Subsequent changes exposing `sqlite_api` and `node_binary` in CLI doctor require an additional clean run and post-merge verification before this PR is closed.

Storage now prefers the non-deprecated `sqlite.Database` on Node 26 while retaining the `DatabaseSync` fallback for Node 22; transaction/WAL/rollback and old `verifykit.sqlite` migration are included in the test suite. **This is cross-platform Node/MCP coverage, not proof that an Antigravity desktop instance inherits the NVM PATH or executes native browser hooks.** External release #15 remains open.

## Actual private STOCKROOM preflight

The four frozen source archives were privately recovered and fingerprinted. Native: 82/82 PHP syntax checks and Vite build passed; A2A-generated: 61/61 PHP syntax checks and Vite build passed. PHPUnit could not start because the test environment lacked required PHP extensions. **None of F01–F18 live HTTP/browser/database cases was established as passed.** See [benchmark preflight](docs/STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md).

## What must happen before release

1. Installed Antigravity plugin validation and real MCP/browser smoke.
2. Isolated executable STOCKROOM F01–F18 with independent HTTP/browser/database observations and genuine concurrent transactions/restarted browser processes.
3. Five matched independent benchmark trials per variant, with official provider usage when available.
4. Independent signed evidence and privacy review; human approval of exact commit.
5. One authorized `v2.0.1 → main` PR followed by fail-closed package publishing.

Documentation: [index](docs/README.md), [security](docs/SECURITY.md), [release](docs/RELEASE.md), [5 Whys](docs/BEHAVIORAL_5_WHYS_V2_0_1.md). No amount of local CI can substitute for missing external evidence.

## Adaptive RCA implementation candidate — 19 November 2026

[PR #49](https://github.com/alifakbxr/a2a/pull/49) introduces source-fresh, opt-in incident and falsifiable hypothesis lifecycle within the existing four MCP tools, SQLite schema migrations, compact-scope risk suggestions, and real local JSON-RPC/stdio RCA integration tests. **This row describes work pending exact CI and post-merge checks; the historical 232/232 Node test count predates these changes.** [Issue #48](https://github.com/alifakbxr/a2a/issues/48) is the code-level implementation gate. Full installed Antigravity, STOCKROOM F01–F18, hardware/browser, independent causal diagnosis and provider-token A/B evidence remain external release gates in [#15](https://github.com/alifakbxr/a2a/issues/15). No merge to `main` or publication is authorized.

## Additional P0 re-audit fixes — issue #50–#53

[PR #62](https://github.com/alifakbxr/a2a/pull/62) addresses CLI missing imports/session fallback, native file-hook matcher/argument compatibility, spoofed or masked exit-status test commands and JUnit/TAP false-PASS parsing. Synthetic adversarial CLI/hooks/test-report regressions are added. Exact PR and post-merge 9-job CI results must be verified separately. This implementation does **not** close the real Antigravity/STOCKROOM external [release gate #15](https://github.com/alifakbxr/a2a/issues/15); other independently open P1/P2 findings #54–#61 remain tracked.

