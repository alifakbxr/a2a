# Release Engineering and Acceptance Gates

## Automated gates available in this repository

- `npm test`: security, storage, graph, impact, contract, evidence, and MCP handshake tests.
- `node scripts/generate-contracts.mjs`: regenerate MCP JSON contracts from executable definitions.
- `node scripts/verifykit.mjs doctor`: runtime capabilities and authorized workspaces.
- `npm run benchmark`: deterministic on-demand scanning and impact microbenchmark; **not** an AI benchmark.
- No extra package or external credentials required.

## Gates that require a real Antigravity installation

1. `agy plugin validate --strict .` with zero errors/warnings.
2. `agy plugin install .` then `agy plugin list` confirms enabled MCP server.
3. Invoke `verifykit_context` in IDE/App/CLI on an explicitly authorized workspace.
4. Verify MCP lazy loading, permissions, and error handling.
5. Run native terminal/browser tests and ingest a JUnit/TAP report.
6. Test cold starts, upgrades, platform-specific paths on Linux, macOS and Windows.
7. Test Git worktree, monorepo, no-git directory and a substantial real-world codebase.
8. Review current Google terms, Marketplace author/logo fields, documentation and licensing before publishing.

## Quality criteria

| Quality gate | Required outcome |
| --- | --- |
| False-PASS adversarial fixture | 0 accepted false PASS in tested corpus |
| Missing/skipped named test | inconclusive |
| Source or artifact changed | stale evidence |
| Unauthorized path | denied |
| Symlink escape | denied |
| MCP process unavailable | native Antigravity continues |
| Secret-like files | not indexed |
| Unknown runtime dependency | explicit warning, no implicit install |
| Cross-platform | repeat identical acceptance suite on each OS |

## Honest status

The repository includes a **working local MCP runtime** with tests and specifications. It has **not** been validated or installed in a live Antigravity environment in the artifact build machine because `agy` is unavailable. Do not label Marketplace-ready until the gates above are completed. In particular, static analysis coverage is intentionally conservative and not a full compiler-grade knowledge graph. This is a runnable engineering release candidate, not a certification of every framework and every Antigravity feature.
