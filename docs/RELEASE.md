# Release Engineering and Acceptance Gates

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

The repository includes a **working local MCP runtime and Antigravity plugin bundle** validated with `agy plugin validate --strict .`, unit/integration tests, and stdio MCP probes. The repository CI matrix tests Node 22 on Ubuntu, macOS and Windows and Node 24 on Ubuntu. This does not replace live Antigravity plugin installation and browser/HTTP/database verification.

## v2.0.1 branch and promotion

The audited changes from [PR #29](https://github.com/alifakbxr/a2a/pull/29) and all 12 original PRs #16–#27 are individually recorded as Merged into the dedicated `v2.0.1` branch, with unchanged combined source tree. See [source PR traceability and the frozen benchmark/release gate](./V2_0_1_TRACEABILITY.md). Implementation issues #3–#14 were closed, but live acceptance/benchmark remains open in #15. Do not re-merge the same feature heads; retain the unmodified main baseline until the external validation gates pass. Only then open one `v2.0.1` → `main` PR with explicit human approval. A green repository CI does not imply a public npm/GitHub release.

## Fail-closed package release authorization

The npm and GitHub Packages publishing workflows now run [release authorization](./RELEASE_AUTHORIZATION.md) before any `npm publish`. A tag/dispatch/release event and a green CI are insufficient: publication needs the identical approved `main` commit, pinned external registry and evaluator keys, signed F01–F18 evidence and detached release approval. Missing external GitHub secrets/approval variable block publication. The release gate is a control, **not evidence that the pending independent acceptance was performed**.

On 18 November 2026, the original frozen STOCKROOM app archives were independently checked for PHP syntax and frontend production builds. They passed those checks, but PHPUnit could not start in the local environment because required PHP extensions were unavailable. Full F01–F18 dynamic acceptance is still not complete. Details: [Frozen STOCKROOM benchmark local rerun](./STOCKROOM_BENCHMARK_RECHECK_2026_11_18.md).
