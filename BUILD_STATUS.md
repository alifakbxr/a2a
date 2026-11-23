# A2A Build and Validation Status — v2.0.1 candidate

> **Current main-branch status (23 Nov 2026; supersedes older branch-freeze notes):** [PR #105](https://github.com/alifakbxr/a2a/pull/105) promoted `v2.0.1` into `main` at `733c0cb`. The [main merge CI](https://github.com/alifakbxr/a2a/actions/runs/45202036041) must be checked for its actual result. The original F01–F18 live acceptance, installed Antigravity agent-selection tests, Guardian overhead and controlled Native/A2A trials remain **unverified** in [main validation backlog](docs/MAIN_VALIDATION_BACKLOG.md). Old pre-main instructions in dated sections below are historical. **No package release was made.**


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

[PR #62](https://github.com/alifakbxr/a2a/pull/62) addresses CLI missing imports/session fallback, native file-hook matcher/argument compatibility, spoofed or masked exit-status test commands and JUnit/TAP false-PASS parsing. Synthetic adversarial CLI/hooks/test-report regressions are added. PR #62 was merged after 9/9 cross-platform CI and succeeded in the subsequent version-branch CI. Real Antigravity/STOCKROOM external [release gate #15](https://github.com/alifakbxr/a2a/issues/15) is still open.


## 19 November 2026 follow-up hardening and remaining acceptance

Post-merge code fixes on `v2.0.1`: PR #62 (CLI, hooks and evidence false-PASS), #63 (exhaustive syntax coverage), #64 (MCP resource privacy), #65 (Node SQLite consistency and runtime diagnostics), #66 (bounded 6.5KB MCP schema). Each was tested through 9-job Node 22/24/26.13.1 CI before merge. Subsequent source changes require their own checks; historical test counts above are **not** current test totals.

PR #67 added bounded safe I/O and release trust diagnostics, #68 added Node version-manager desktop PATH advice, and PR #69 integrated cross-platform HOME/path normalization and IDE-trust metadata safeguards. `main` stays frozen, external independent STOCKROOM acceptance F01–F18, live installed Antigravity validation and repeated A/B token trials remain open in issue #15; passing local CI is not equivalent to release certification.

## Final code-level audit reconciliation — 19 November 2026

Source-audited issues #50–#61 have been addressed through PR #62–#69 on the v2.0.1 integration branch, subject to final post-merge CI. This includes Adaptive RCA, strict local test provenance, safe native hooks, full syntax checks, MCP privacy, bounded trust-file reads, cross-platform workspace boundaries, Node 22/24/26.13.1 compatibility, and shortened tools/list descriptions. The 6,500-byte MCP contract cap retains all four tools and Adaptive RCA operations; it is a **byte bound**, not an official token-billing or causal savings measurement.

Independent real Antigravity installation, frozen STOCKROOM F01–F18 security/financial/browser acceptance and repeated controlled Native/A2A benchmarks remain mandatory in open issue #15. The main branch remains unchanged. Do not publish, tag, promote into main or assert production-readiness based on local CI alone.

### 23 November 2026 — current development candidate

Merged PRs #94 (routing profiles), #95 (accurate eager history counts), #96 (opt-in Guardian), #97 (intervention ledger eager/foreign MCP accuracy), and #98 (hook command path hardening). Current `v2.0.1` SHA `9f4202903353a1260f24e1e3354c7cd05fda08a7`, with [9/9 post-merge CI success](https://github.com/alifakbxr/a2a/actions/runs/45165794296) on Ubuntu/macOS/Windows × Node 22/24/26.13.1. Prior 213/213 and 4/4 counts earlier in this document are historical, not this commit's current suite count. **No independent F01–F18 release acceptance or ≥5 matched Native/A2A experiments has been executed here.** Issues #15, #71, #91 and #92 remain open. No npm publication, tag or `main` promotion.

## 23 November 2026 — follow-up re-audit and original-archive preflight

**Audited code snapshot:** `v2.0.1` @ `27a33d4b1071a44948ead832ff1f151accc48afd` (before this documentation update); `main` remains at `b622110d0feabf469390a41f3c93338053b3c7b6`. Four remaining **open** issues: [#15](https://github.com/alifakbxr/a2a/issues/15), [#71](https://github.com/alifakbxr/a2a/issues/71), [#91](https://github.com/alifakbxr/a2a/issues/91), [#92](https://github.com/alifakbxr/a2a/issues/92).

- [PR #100](https://github.com/alifakbxr/a2a/pull/100) corrected uncertainty routing; its PR 9/9 CI passed.
- [PR #101](https://github.com/alifakbxr/a2a/pull/101) fixed opt-in Guardian non-object hooks manifest handling and pinned its Node binary to the explicitly enabling executable; its PR 9/9 CI passed.
- [PR #102](https://github.com/alifakbxr/a2a/pull/102) fixed foreign MCP attribution / quoted lazy inputs. It was merged to **development only** after 8/9 CI jobs succeeded; the macOS Node 24 job was **queued, not successful** at merge time.
- [PR #103](https://github.com/alifakbxr/a2a/pull/103) corrected verification-plan evidence advice. It was merged to **development only** after 6/9 CI jobs succeeded; three macOS jobs were **queued, not successful** at merge time.
- Merged source and regression-test Git blobs for #101–#103 were individually re-fetched and matched their PR heads. The latest post-merge branch CI [run #45199814753](https://github.com/alifakbxr/a2a/actions/runs/45199814753) was queued when this audit was recorded. Do not reinterpret partial CI as 9/9 passed.
- The original Library snapshots `stockroom-native(2).zip` and `stockroom-a2a(1).zip` were independently retrieved, matched the previously recorded SHA-256 hashes, and privately inspected without exporting `.env`, source or raw transcripts. `php -l` passed **101/101** Native and **80/80** A2A first-party PHP files. PHPUnit could not start in this environment (missing `dom`, `mbstring`, `xmlwriter`, and PDO SQLite). **None** of the required independent F01–F18 runtime acceptance cases was newly executed or established as PASS.
- No fresh installed Antigravity parent/subagent agent-selection trial, real per-turn Guardian latency/token experiment, or ≥5 controlled matched Native/A2A runs was completed by this audit.

**Release decision: NO-GO.** General user authorization to proceed does not satisfy independent execution/signature requirements. No `v2.0.1 -> main` promotion, tag or publication is justified until #15/#71/#91/#92 verification evidence is complete.
