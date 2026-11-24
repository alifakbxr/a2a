# PILAH — release process

**Current status: NO-GO (24 November 2026).** Source `main` includes PILAH `2.1.0`; externally signed F01–F18 and installed Antigravity host acceptance are **not verified**. No source merge, tag or green CI authorizes publishing on its own. Repository is still `the existing repository`; `@aliip/pilah` has not been verified as published.

## Source quality gate

```sh
node --version
npm run check
node scripts/check-release.mjs
node scripts/pilah.mjs doctor
npm pack --dry-run
```

These inspect source syntax, full Node tests, MCP/schema/manifest contract, runtime environment and package content. They do **not** prove real project workflows, Antigravity integration or external acceptance.

**CI configuration:** PRs run 1 full-suite Ubuntu/Node 24 job, `main` pushes run 3 OS full-suite Node 24 jobs. Before release, manually dispatch the complete **9-job** Ubuntu/macOS/Windows × Node 22/24/26.13.1 matrix. See [CI budget](CI_EFFICIENCY.md).

## Installed Antigravity gate

Run `node scripts/pilah.mjs host-check` on the machine with the actual Antigravity CLI. It must report a local preflight result and explicitly preserves `live_agent_adoption: not_tested`; that result is **not** a substitute for in-IDE behavioral acceptance.

Run `agy plugin validate --strict .` and inspect `agy plugin list` on the exact source. Test the four new `pilah_*` MCP tools with authorized and denied workspaces in actual Antigravity. Check plugin restart, NVM Node PATH, lazy tool discovery, user workspace trust, worktrees and meaningful native project tests. A source-level MCP subprocess test is not a live plugin test.

## Independent application and release gate

- Execute the frozen [STOCKROOM F01–F18 scenarios](INDEPENDENT_ACCEPTANCE_RUNBOOK.md) in a real, isolated HTTP/database/browser environment, including negative and concurrency cases.
- Run matched [Native-vs-PILAH A/B evaluations](AB_EVALUATION.md). Avoid false claims about quota percentages and token savings.
- Review privacy, evidence source revisions, scope binding and named test provenance. False PASS or stale signatures must fail closed.
- Satisfy the [independently signed package-release authorization](RELEASE_AUTHORIZATION.md), including immutable registry, evaluator keys, trusted F01–F18 results and human approval for the exact `main` commit.
- Only after authorization should the separately guarded npm/GitHub Packages workflows publish. The source manifest alone is not proof of package availability.

See [build status](../BUILD_STATUS.md) and [open evidence backlog](MAIN_VALIDATION_BACKLOG.md). Legacy `v2.0.1` promotion instructions are historical in [traceability](V2_0_1_TRACEABILITY.md), not active release instructions.
