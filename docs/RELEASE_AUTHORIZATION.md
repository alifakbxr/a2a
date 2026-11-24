# PILAH — independently authorized releases

**Status: NO-GO.** PILAH's source manifest is version `1.0.0`, but independent installed-host and F01–F18 acceptance have not been completed and signed. A green CI, merged PR, Git tag, manual workflow dispatch or GitHub Release is **not** authorization to publish.

## Executable authority

The actual release contract lives in [`scripts/release-authorization.mjs`](../scripts/release-authorization.mjs), [`scripts/evaluate-acceptance.mjs`](../scripts/evaluate-acceptance.mjs), the checked-in [release test suite](../tests/release_authorization.test.mjs) and [publishing workflows](../.github/workflows/publish-npm.yml). The existing internal configuration names, signed payload identifiers and repository identity remain unchanged for backward compatibility. **Do not derive new names from the PILAH brand.** Use those source files for the exact names and formats; this guide intentionally does not duplicate or rename internal identifiers.

## Mandatory gate

1. The publishing checkout must match the **current approved `main` commit** and the actual repository identity expected by the validator. Tag-triggered publication requires an exact `v<package.json version>` tag; manual dispatch must use the permitted branch.
2. An independently configured repository variable must pin the approved 40-character commit SHA. There is no automatic approval or emergency bypass.
3. Externally controlled secrets must provide an evidence manifest, a frozen acceptance registry, and pinned evaluator/reviewer **Ed25519 public keys**. Their exact key names are in the publishing workflow.
4. All required frozen scenarios **F01–F18** must be independently executed, source-bound and supported by valid signed machine-evidence receipts. Missing, partial, stale, self-asserted or inconsistent reports must fail closed.
5. The reviewer must independently confirm an installed Antigravity host test, a privacy review and matched repeated evaluation. Repository unit tests are not substitutes.
6. A **separate detached Ed25519 approval signature** must bind the target repository, commit, package version, source revision, registry digest, completion flags and approval time. Keep private signing keys outside the repository and CI. Expired or future-dated approvals are rejected.
7. The publishing workflows must re-run authorization at the actual target commit before any package upload.

## Negative controls and evidence integrity

Historical STOCKROOM snapshots include deliberately defective examples. **They are negative controls**, not releasable applications proven correct. The evaluator may verify that PILAH correctly identifies missing evidence or unsafe behavior, but must never relabel a defective application as meeting financial, security, offline or concurrency requirements.

Signed passing evidence must correspond to the exact tested code, declared scenario, required evidence type and real execution. Screenshots, passing build logs and test titles alone do not demonstrate transaction correctness, real browser sessions, hardware access or independent acceptance.

## Release procedure

1. Run `npm run check`, `node scripts/check-release.mjs`, package hygiene checks and the manually dispatched complete **nine-job** cross-platform Node compatibility matrix.
2. Perform live PILAH plugin validation on the installed host and independent [application acceptance](INDEPENDENT_ACCEPTANCE_RUNBOOK.md).
3. Review the [validation backlog](MAIN_VALIDATION_BACKLOG.md), privacy findings, complete frozen scenario results, model token measurements and all negative controls.
4. Obtain externally pinned signatures and explicit maintainer approval for the **exact commit**.
5. Only then trigger the signed publishing workflows. A package manifest does not prove a package exists in a registry.

For the latest evidence and caveats see [build status](../BUILD_STATUS.md) and [release process](RELEASE.md). **No publication is implied by this documentation.**
