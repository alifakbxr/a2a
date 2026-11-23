# Release Engineering and Acceptance Gates

> **Current main-branch status (23 Nov 2026; supersedes older branch-freeze notes):** [PR #105](https://github.com/alifakbxr/a2a/pull/105) promoted `v2.0.1` into `main` at `733c0cb`. The [main merge CI](https://github.com/alifakbxr/a2a/actions/runs/45202036041) must be checked for its actual result. The original F01–F18 live acceptance, installed Antigravity agent-selection tests, Guardian overhead and controlled Native/A2A trials remain **unverified** in [main validation backlog](MAIN_VALIDATION_BACKLOG.md). Old pre-main instructions in dated sections below are historical. **No package release was made.**



## Automated gates available in this repository

- `npm test`: security, storage, graph, impact, contract, evidence, skeletonizer, telemetry, hooks, and MCP handshake tests.
- `node scripts/generate-contracts.mjs`: regenerate MCP JSON contracts from executable definitions.
- `node scripts/check-release.mjs`: manifest, hooks, rules, schema drift, and required file checks.
- `node scripts/a2a.mjs doctor`: runtime capabilities, mode/compact/auto-trust settings, and authorized workspaces.
- `npm run benchmark`: deterministic on-demand scanning and impact microbenchmark; **not** an AI benchmark.
- No extra package or external credentials required.

## Gates that require a real Antigravity installation

1. `agy plugin validate --strict .` with zero errors/warnings.
2. `agy plugin list` confirms `a2a` enabled with skills, rules, hooks, and MCP server.
3. Invoke `a2a_context`, `a2a_impact`, `a2a_verify`, and `a2a_evidence` in IDE/App/CLI on an authorized workspace.
4. Verify MCP lazy loading, permissions, error handling, and `a2a refresh`.
5. Run native terminal/browser tests and ingest a JUnit/TAP/`a2a-test-report-v1` report.
6. Test cold starts, upgrades, platform-specific paths on Linux, macOS and Windows.
7. Test Git worktree, monorepo, no-git directory and a substantial real-world codebase.
8. Review current Google terms, Marketplace author/logo fields, documentation and licensing before publishing.

## Quality criteria

| Quality gate | Required outcome |
| --- | --- |
| False-PASS adversarial fixture | 0 accepted false PASS in tested corpus |
| Missing/skipped named test | inconclusive |
| Source or artifact changed | stale evidence |
| Unauthorized / protected path | denied |
| Upward ancestor authorization | denied |
| Symlink escape | denied |
| MCP process unavailable | native Antigravity continues |
| Secret-like files & lockfiles | not indexed |
| Unknown runtime dependency | explicit warning, no implicit install |
| Cross-platform | repeat identical acceptance suite on each OS |

## Honest status

The repository includes a **working local MCP runtime and Antigravity plugin bundle** checked by Node automated tests, including a real local JSON-RPC/stdio MCP subprocess and SQLite E2E. The current candidate still needs a **fresh, installed Antigravity `agy plugin validate --strict .`** run before release; past validation reports do not substitute for that live check. The current repository CI matrix targets Node 22, 24 and 26.13.1 on Ubuntu, macOS and Windows (nine jobs). This does not replace live Antigravity plugin installation and browser/HTTP/database verification.

## v2.0.1 branch and promotion

The audited changes from [PR #29](https://github.com/alifakbxr/a2a/pull/29) and all 12 original PRs #16–#27 are individually recorded as Merged into the dedicated `v2.0.1` branch, with unchanged combined source tree. See [source PR traceability and the frozen benchmark/release gate](./V2_0_1_TRACEABILITY.md). Implementation issues #3–#14 and behavioral implementation issues #30–#35 are closed; the behavioral [PR #36](https://github.com/alifakbxr/a2a/pull/36) was merged into `v2.0.1` at `67ea5888caf61751952c8a7daa1eb222d738d4b6`. Live acceptance/benchmark remains open in #15. Do not re-merge the same feature heads; retain the unmodified main baseline until the external validation gates pass. Only then open one `v2.0.1` → `main` PR with explicit human approval. A green repository CI does not imply a public npm/GitHub release.

## Fail-closed package release authorization

The npm and GitHub Packages publishing workflows now run [release authorization](./RELEASE_AUTHORIZATION.md) before any `npm publish`. A tag/dispatch/release event and a green CI are insufficient: publication needs the identical approved `main` commit, pinned external registry and evaluator keys, signed F01–F18 evidence and detached release approval. Missing external GitHub secrets/approval variable block publication. The release gate is a control, **not evidence that the pending independent acceptance was performed**.

On 18 November 2026, the original frozen STOCKROOM app archives were independently checked for PHP syntax and frontend production builds. They passed those checks, but PHPUnit could not start in the local environment because required PHP extensions were unavailable. Full F01–F18 dynamic acceptance is still not complete. Details: [Frozen STOCKROOM benchmark local rerun](./STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md).

## 19 November 2026 re-audit release hold

[PR #43](https://github.com/alifakbxr/a2a/pull/43) addresses #38–#42, including a false-positive native handoff path and a hook run-status ambiguity. Both P0 issues prevent release confidence until regression coverage and exact post-merge CI pass. It also hardens mixed permission denial handling, explicit plan-scope persistence and opt-in full Markdown content retention. **Do not infer successful real Antigravity operation from a local synthetic hook fixture.** External F01–F18, human approval and issue #15 are still outstanding.

## Current behavioral hardening CI (18 November 2026)

**Source:** [PR #36](https://github.com/alifakbxr/a2a/pull/36) merged to `v2.0.1` at `67ea5888caf61751952c8a7daa1eb222d738d4b6`. [Post-merge CI run #44325007116](https://github.com/alifakbxr/a2a/actions/runs/44325007116) completed **4/4 successful jobs**, with **213/213 Node tests** on Ubuntu Node 22. This includes local real MCP stdio/SQLite E2E for authorized/denied workspaces, typed criteria, negative false-PASS controls, checkpoint recovery and privacy. It **does not** prove Antigravity installed-plugin behavior, Figma/browser visual states, printer hardware, Laravel HTTP/database transactions, or any independent F01–F18 PASS.

The behavioral [Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md) is recorded with root-cause hypotheses, mitigations, and falsifiable local tests. The complete current status is in [Build Status](../BUILD_STATUS.md) and [traceability](V2_0_1_TRACEABILITY.md). **Issue #15 is open: NO-GO until independent acceptance, privacy review, repeated benchmark and explicit human approval.**

## 23 November 2026 — current release candidate hold

The `v2.0.1` integration branch now includes source-level audit fixes through PR #103, including Guardian's opted-in absolute Node path, historical MCP attribution, and verification-planning route semantics. The original STOCKROOM Native/A2A Library ZIPs were recovered and compared against their recorded hashes; independent source lint passed 101/101 and 80/80 first-party PHP files respectively. PHPUnit and live application acceptance did **not** execute because necessary PHP extensions (including SQLite driver) were unavailable, and a real isolated database/browser test environment was not provisioned.

Pending release blockers: issue #15 frozen F01–F18 HTTP/browser/DB negative controls, two-connection concurrency and full browser restarts, external signed acceptance and privacy review; #71 observed Antigravity parent/subagent A2A tool selection; #91 real Guardian overhead and behavior; #92 randomized ≥5 matched Native/A2A benchmark trials with official provider usage where possible. At development merge time PR #102 had 8/9 green jobs and PR #103 6/9 with unstarted macOS jobs; the full post-merge version-branch matrix is still required. See [build status](../BUILD_STATUS.md) for exact references.

**Do not merge into `main` yet**, even with general permission to complete the project: this release's defined execution evidence is still missing. No automatic tag, npm publish or GitHub release.
