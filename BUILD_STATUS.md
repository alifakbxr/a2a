# PILAH — source and release status

**27 November 2026 — v1.1.1 stable source baseline.** Canonical source: [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Version 1.1.0 is published on npmjs as `@aliip/pilah@1.1.0` (`latest`, `stable`). Version 1.1.1 is the active source release candidate.

## Verified source scope

| Evidence | Status | Boundary |
| --- | --- | --- |
| Main CI before the version bump | **3/3 passed** on Ubuntu/macOS/Windows, Node 24 ([run](https://github.com/alifakbxr/pilah/actions/runs/45933929631)) | Verify the 1.1.1 candidate at its own commit |
| PR #144 and PR #146 | Merged: headless audit, accepted-task denominator and regression tests | Local parser correctness, not live agent correctness |
| 1.1.1 source manifests and documentation | Release candidate in this update | Exact candidate CI and contract check must pass |
| Historical source branding | PILAH rebrand [PR #107](https://github.com/alifakbxr/pilah/pull/107), CI optimization [PR #108](https://github.com/alifakbxr/pilah/pull/108) | Historical traceability only |

PILAH's runtime is based on Node >=22.13.0 and four local MCP tools. The normal CI configuration uses **3/3** Node 24 OS jobs for main pushes; the full **9-job** Node 22/24/26.13.1 × three-OS matrix must be manually checked before an authorized package release.

## External acceptance and publication

**Source stability:** the source-level APIs, tests, privacy boundaries and documentation are maintained as the 1.1.1 baseline.

**Package-release gate: NO-GO.** Installed Antigravity H01–H06 adoption, externally executed F01–F18, independent privacy review, controlled Native/PILAH A/B acceptance, and a signed approval for the exact release commit are **unverified**. No source-only CI can satisfy these gates.

The 27 November headless pilot contained **zero independently comparable Native/PILAH pairs**. Quota/permission-blocked attempts are not efficiency wins. Issue #145 was closed after PR #146 introduced fail-closed task acceptance metrics; source closure is not independent validation.

The old npmjs 1.0.3 attempt failed with `EOTP`; historical GitHub Packages job status did not establish authorized publication. Check actual registry artifacts independently before claiming any version is installed.

See [changelog](CHANGELOG.md), [release process](docs/RELEASE.md), [release authorization](docs/RELEASE_AUTHORIZATION.md) and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).
