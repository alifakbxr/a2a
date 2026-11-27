# PILAH — release process

**Current source: 1.1.0 (stable source baseline). Registry publication: NO-GO** until the independently signed release requirements below are met. This is a source-version change, **not** a published package, an authorized tag or proof of live Antigravity adoption.

## 1. Source quality checks

Run on the exact candidate commit:

```sh
node --version
npm run check
node scripts/check-release.mjs
node scripts/pilah.mjs doctor
npm pack --dry-run
```

Verify the npm package, `package-lock.json`, plugin manifest, MCP initialize version and dashboard all agree on `1.1.0`. Confirm the package tarball excludes tests, benchmarks, sensitive files and local databases.

Routine CI is **1** Ubuntu/Node 24 job per PR and **3** Ubuntu/macOS/Windows Node 24 jobs on a `main` push. The separately dispatched **9-job** compatibility matrix (3 OS × Node 22/24/26.13.1) is required before external release authorization. [CI guide](CI_EFFICIENCY.md).

## 2. Installed-host acceptance

On a machine running the actual Antigravity installation:

```sh
agy plugin validate --strict .
agy plugin list --json
node scripts/pilah.mjs host-check
```

Run the [H01–H06 host scenarios](HOST_VALIDATION.md): tool registration/selection, permission denial, zero-call control, parent/subagent behavior, IDE restart and workspace isolation. A CLI preflight alone is not proof of an IDE session.

## 3. Independent functional evidence

- Independently run the evaluator-owned F01–F18 scenarios with real HTTP/database/browser tests, including negative and concurrency controls.
- Perform matched Native/PILAH trials using identical source snapshot, model, effort, permission policy and externally accepted task rubric. Report attempts and accepted-task usage separately.
- Review private artifacts, workspace authorization and evidence provenance; missing or stale evidence fails closed.
- Obtain detached, independently signed approval bound to the exact release commit and registry digest. See [release authorization](RELEASE_AUTHORIZATION.md).

**Do not bypass** the authorization validator, publish manually, mark incomplete tests PASS or label source CI as a release certificate.

## 4. Publication and verification

The publishing workflows are deliberately `workflow_dispatch` only and run `scripts/release-authorization.mjs` before network publication. The approved package identities are:

| Registry | Target package |
| --- | --- |
| npmjs | `@aliip/pilah@1.1.0` |
| GitHub Packages | `@alifakbxr/pilah@1.1.0` |

These are **targets, not verified registry listings**. Once all signed gates have passed, a maintainer may run the guarded workflows. Only confirmed registry 404 is treated as absent; authentication, rate-limit and network failures must fail closed.

Verify actual package availability after a successful upload:

```sh
npm view @aliip/pilah@1.1.0 version --registry=https://registry.npmjs.org/
# Requires authorized GitHub Packages credentials:
npm view @alifakbxr/pilah@1.1.0 version --registry=https://npm.pkg.github.com
```

Do not create a Git tag or GitHub Release implying authorized publication until that process is complete. The historical 1.0.3 npmjs `EOTP` failure is recorded in the [changelog](../CHANGELOG.md); it does not prove or disprove publication of 1.1.0.

[Current build status](../BUILD_STATUS.md) · [Validation backlog](MAIN_VALIDATION_BACKLOG.md) · [Changelog](../CHANGELOG.md).
