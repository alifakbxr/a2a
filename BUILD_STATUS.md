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
- Privacy-preserving telemetry for historic conversations; no fabricated token savings.

## Actual private STOCKROOM preflight

The four frozen source archives were privately recovered and fingerprinted. Native: 82/82 PHP syntax checks and Vite build passed; A2A-generated: 61/61 PHP syntax checks and Vite build passed. PHPUnit could not start because the test environment lacked required PHP extensions. **None of F01–F18 live HTTP/browser/database cases was established as passed.** See [benchmark preflight](docs/STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md).

## What must happen before release

1. Installed Antigravity plugin validation and real MCP/browser smoke.
2. Isolated executable STOCKROOM F01–F18 with independent HTTP/browser/database observations and genuine concurrent transactions/restarted browser processes.
3. Five matched independent benchmark trials per variant, with official provider usage when available.
4. Independent signed evidence and privacy review; human approval of exact commit.
5. One authorized `v2.0.1 → main` PR followed by fail-closed package publishing.

Documentation: [index](docs/README.md), [security](docs/SECURITY.md), [release](docs/RELEASE.md), [5 Whys](docs/BEHAVIORAL_5_WHYS_V2_0_1.md). No amount of local CI can substitute for missing external evidence.
