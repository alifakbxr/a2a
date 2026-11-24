# PILAH — release process

**Current status: NO-GO (24 November 2026).** Source `main` includes PILAH `1.0.1`; externally signed F01–F18 and installed Antigravity host acceptance are **not verified**. No source merge, tag or green CI authorizes publishing on its own. Canonical repository: `alifakbxr/pilah`. The source npmjs package is `@aliip/pilah`; registry publication of the exact version must be independently verified.

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
- Run matched Native-vs-PILAH evaluations under controlled trials. Avoid false claims about quota percentages and token savings.
- Review privacy, evidence source revisions, scope binding and named test provenance. False PASS or stale signatures must fail closed.
- Satisfy the [independently signed package-release authorization](RELEASE_AUTHORIZATION.md), including immutable registry, evaluator keys, trusted F01–F18 results and human approval for the exact `main` commit.
- Only after authorization should the separately guarded npm/GitHub Packages workflows publish. The source manifest alone is not proof of package availability.

See [build status](../BUILD_STATUS.md) and [open evidence backlog](MAIN_VALIDATION_BACKLOG.md). Legacy `v2.0.1` promotion instructions are historical in [traceability](V2_0_1_TRACEABILITY.md), not active release instructions.

## Package identity and fail-closed publication

The primary public npmjs package is `@aliip/pilah@1.0.1`. The GitHub Packages counterpart is `@alifakbxr/pilah@1.0.1`. The old `@alifakbxr/a2a@2.1.0` artifact remains a legacy compatibility release, not a new release target. CLI aliases in source remain supported. Do not republish an immutable legacy version.

Both workflows **always** execute `scripts/release-authorization.mjs`; no evidence or mismatched approval must fail before network publication. A registry version check may skip only when the exact version is confirmed present. A verified E404 is treated as not-yet-published; authentication, access, and network failures must fail, not be labeled "already exists". After successful publication, verify the exact registry version.

Check GitHub Actions logs for actual package upload (a successful job alone is not evidence), then independently query:
```sh
npm view @aliip/pilah@1.0.1 version --registry=https://registry.npmjs.org/
# GitHub Packages requires authorized registry credentials:
npm view @alifakbxr/pilah@1.0.1 version --registry=https://npm.pkg.github.com
```
Do not tag or trigger release workflows without the independent signed acceptance material specified in [release authorization](RELEASE_AUTHORIZATION.md).
