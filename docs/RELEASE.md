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

The repository includes a **working local MCP runtime and Antigravity plugin bundle** validated with `agy plugin validate --strict .`, unit/integration tests, and stdio MCP probes. Cross-OS validation on macOS and Windows remains external to Linux CI.
