# Semantic and Browser Evidence — issue #8

A2A provides read-only local evidence assessment via:

- `a2a_verify(operation="assess_semantic",artifact="reports/scenarios.json")`
- `a2a_verify(operation="assess_browser",artifact="reports/browser.json")`
- `node scripts/semantic-evidence.mjs reports/scenarios.json` for an offline standalone report

`assess_semantic` checks scenario-specific structural observations against the current workspace revision. Supported categories include genuine two-connection overlapping stock checkout, browser process restart with a persistent profile, idempotent response loss with conflicting payload, payment arithmetic, bounded refund/restock, tenant/store entrypoint matrix, invitation and authentication negatives.

**Crucially:** a test named `ConcurrentCheckoutTest` or a JSON `witnessed_capabilities` list never proves parallel execution. The evaluator computes capabilities from structured facts. All facts are still **unattested** caller input; results can only be `evidence-present-unattested`, `insufficient-evidence` or `stale`, never independently verified release approval.

The browser contract is `a2a-browser-evidence-v1`. It requires a scenario ID, source fingerprint, build artifact SHA-256, claimed served build hash, browser version, runner version, timestamps, executed assertions, and optional hashed local artifact references. A2A recomputes referenced artifact file hashes locally using workspace-safety rules. A matching pair of digest strings is **not** proof that the expected build was served; external harness/CI review remains necessary. Screenshots by themselves are not functional assertions.

The 18 predefined negative-control cases from STOCKROOM are listed in `tests/fixtures/stockroom-acceptance-18.json`. They are **frozen acceptance specifications**, not completed independent browser/PHP E2E results. Backend isolation, payment and exactly-once invariants still require independently executed test runners.

A2A does not control Chrome, install dependencies, run arbitrary project commands or bypass approvals.
