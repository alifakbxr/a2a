# PILAH — source and release status

**27 November 2026 — stable source baseline v1.1.1** at [`4de2b38`](https://github.com/alifakbxr/pilah/commit/4de2b380dab51a6f454410efd6da0869187d8304). This describes the repository source, not a package publication.

**Registry status:** the latest npmjs publication recorded by this project is `@aliip/pilah@1.1.0`. Publication of `@aliip/pilah@1.1.1` or `@alifakbxr/pilah@1.1.1` is **not verified**. The existing `v1.1.1` Git tag and GitHub Release are source-only references; neither is package publication or release authorization. Verify live registry state before installing or announcing a package version.

## Verified source scope

| Evidence | Status | Boundary |
| --- | --- | --- |
| CI on exact v1.1.1 source commit | **3/3 passed** on Ubuntu/macOS/Windows, Node 24 ([run](https://github.com/alifakbxr/pilah/actions/runs/45945302975)) | Source CI only; does not prove installed Antigravity behavior or external acceptance |
| Full compatibility matrix | **Not run on the exact v1.1.1 commit** | The 9-job Node 22/24/26.13.1 × three-OS matrix remains required before package-release authorization |
| PR #144 and PR #146 | Merged: headless audit, accepted-task denominator and regression tests | Local parser correctness, not live agent correctness |
| Source manifests | `package.json`, lockfile and plugin manifest agree on **1.1.1** | This is not evidence that 1.1.1 exists in a registry |
| Historical source branding | PILAH rebrand [PR #107](https://github.com/alifakbxr/pilah/pull/107), CI optimization [PR #108](https://github.com/alifakbxr/pilah/pull/108) | Historical traceability only |

PILAH's runtime is based on Node >=22.13.0 and four local MCP tools. Routine main CI covers three Node 24 OS jobs. The full nine-job matrix must be run before an authorized package release; unrun combinations must not be described as passing.

## Publication history and authorization

The project records `@aliip/pilah@1.1.0` as manually published to npmjs. The visible repository Actions history does not contain a matching guarded publish-workflow run, and no signed approval artifact is linked from the repository. This audit cannot determine whether a separate out-of-band approval existed. Treat the 1.1.0 publication as a historical authorization-evidence gap; do not repeat the manual process.

The current checked-in npmjs and GitHub Packages publishing workflows are `workflow_dispatch` only. Both invoke the independent authorization validator before publication. A source tag, GitHub Release, green CI run or manual workflow dispatch is not approval.

## External acceptance and publication

**Source stability:** the source-level APIs, tests, privacy boundaries and documentation are maintained as the 1.1.1 baseline.

**Package-release gate: NO-GO.** Installed Antigravity H01–H06 adoption, externally executed F01–F18, independent privacy review, controlled Native/PILAH A/B acceptance, the full compatibility matrix, and a signed approval for the exact release commit are **unverified**. No source-only CI can satisfy these gates.

The 27 November headless pilot contained **zero independently comparable Native/PILAH pairs**. Quota/permission-blocked attempts are not efficiency wins. Issue #145 was closed after PR #146 introduced fail-closed task acceptance metrics; source closure is not independent validation.

See [changelog](CHANGELOG.md), [release process](docs/RELEASE.md), [release authorization](docs/RELEASE_AUTHORIZATION.md) and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).
