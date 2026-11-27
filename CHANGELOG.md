# Changelog

All notable PILAH source changes are documented here. Versions in this file describe source manifests; a version bump or Git merge alone does **not** establish a published package, installed-host validation, or independent release approval.

## [1.1.0] - 2026-11-27

### Stable source baseline

- Consolidated the native-first workflow around four MCP tools: `pilah_context`, `pilah_impact`, `pilah_verify`, and `pilah_evidence`.
- Maintained bounded workspace authorization, local-only code intelligence, revision-aware impact pagination, privacy-aware artifact/evidence tracking, and read-only host diagnostics.
- Added offline headless-capture auditing and fail-closed A/B quality classification. Permission-denied, empty-response, quota-limited, incomplete, and unaccepted runs cannot create misleading completed-task token medians.
- Preserved separate provider-reported token attempts and externally accepted-task denominators. No measured causal savings are claimed.
- Aligned the npm package, lockfile, plugin manifest, CLI/MCP version contract and MCP dashboard version display.
- Consolidated current documentation, validation boundaries and release instructions. Historical implementation notes remain in Git history.

### Compatibility

- Node.js >=22.13.0; normal CI targets Node 24 on Ubuntu, macOS and Windows.
- The full 9-job Node 22/24/26.13.1 × 3-OS matrix remains a manual pre-release check.
- Historical CLI aliases and on-disk migrations are retained for existing installations; do not remove them as part of documentation cleanup.

### Release and benchmark status

The 1.1.0 source baseline can be considered stable after its own CI passes. **Registry publication is independently gated and remains NO-GO** without signed F01–F18 acceptance, live installed Antigravity validation, privacy review and a signed authorization bound to the exact release commit. No tag or publication should be inferred from this entry.

## [1.0.4] - 2026-11-27

- Hardened MCP impact pagination and tested the stdio continuation path.
- Added the private headless CLI audit and associated source-level regression tests.
- Reworked A/B reporting to distinguish attempts from mechanically complete and independently accepted tasks.

## [1.0.3] - 2026-11-25

- Source hardening, CLI/host checks, cross-platform test coverage and release-authorization prerequisites.
- The historical npmjs 1.0.3 publication attempt failed with `EOTP`. This is not evidence of any later version being published.

For current procedures, see [release process](docs/RELEASE.md), [build status](BUILD_STATUS.md) and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).
