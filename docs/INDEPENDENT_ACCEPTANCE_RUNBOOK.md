# Independent validation runbook — A2A v2.0.1

This is an **execution checklist**, not a report claiming these tests were run.
Never modify the four original STOCKROOM benchmark ZIPs. Copy to disposable test workspaces.
PR #29 was merged into the dedicated `v2.0.1` branch at commit `049a5297fbd4c542918f4a23e9676d5e2b0530ce`; #16–#27 were subsequently individually merged into `v2.0.1`, and `main` remains unchanged. This is a version-branch merge, not a published or independently validated release.

## 1. Reproducible installed-plugin environment
- Antigravity with documented native CLI/MCP/browser access, explicitly authorized **temporary** workspace.
- Node 22.13+; PHP/Laravel dependencies and the database driver matching the original test environment; Chrome/Chrome for Testing.
- Separate model quotas/accounts do not imply equivalent token budgets. Obtain official CLI usage if exposed.
- Separate browser profiles, isolated credentials, synthetic tenants/stores/users, and local test databases. Do not test mutations against production.
- Independent evaluator generates test assertions and Ed25519 receipts; the coding agent must not control the signing key or its trusted public-key configuration.

## 2. Local A2A quality gate (repository checkout)
```sh
npm test
node scripts/check-release.mjs
npm pack --dry-run
node scripts/a2a.mjs doctor
```

Verify MCP `tools/list` exposes **exactly four** tools and `a2a_verify` includes assess, assess_release, assess_semantic, assess_browser and verify_handoff. Verify workspace-trust rejection and source-revision invalidation after file changes. The test suite is intended for Linux/macOS/Windows on Node 22/24. No agent/browser is automatically spawned by A2A.

## 3. Frozen 18-case external acceptance matrix
Use `tests/fixtures/stockroom-acceptance-18.json` for IDs F01–F18; every case begins **not tested**. The external runner must issue **real HTTP/browser/database** operations against each generated app copied from frozen ZIPs.

- F01–F03: deny unauthorized roles and foreign-store/related IDs, then query the database for zero changes.
- F04–F07: verify exact price, tax, payments, duplicate-line refund and money-only refund stock invariants.
- F08–F09: **two independent DB connections with overlapping transactions** for last-stock and transfer receive/cancel (no sequential mock).
- F10–F11: kill **entire** browser process, restart with persistent profile, test offline queue and cross-account cache.
- F12: inject network response loss after committed DB transaction, retry exact operation ID and mutate payload to prove conflict.
- F13–F16: negative RBAC browser assertion, reject self-declared witnesses, production demo credential lockout, sanitized backend exceptions.
- F17: source snapshot differs from served build; evidence must become stale.
- F18: differing test counts without a common external suite must **not** produce a winner.

No unit-test name, human prose or custom JSON witness list may be accepted as proof of actual concurrency or complete offline restart.

## 4. Machine evidence and signed trust
- Report each scenario with source revision, test report hash, timestamp, runner metadata and actual external assertions. Attach browser/build digest and observed backend row counts.
- For browser results, `a2a_verify(operation="assess_browser",artifact="...")` must return `inconclusive` or `evidence-present-unattested` unless separately corroborated; it must **never** certify production readiness.
- `a2a_verify(operation="assess_semantic",artifact="...")` computes structural scenario conditions but **never** authenticates a self-supplied runner.
- Set up a separate, frozen acceptance registry at `~/.config/a2a/acceptance-registry.json` with matching scenario IDs, requirement SHA-256 digests, criticality, and required evidence types. **Absent or altered scope must block release eligibility**. The coding agent may not edit this file.
- Set up `~/.config/a2a/trusted-evaluators.json` with evaluator **public** keys under independent user control, and sign each evidence payload with the evaluator private key after running the actual tests.
- `a2a_verify(operation="assess_release",artifact="...")` only offers eligible-for-review when signatures, revisions, required evidence types and critical blockers are all satisfied. A valid signature does not itself prove that tests executed honestly.
- Treat critical unproven cases as blockers and preserve report state `inconclusive`.

## 5. Benchmark attribution and privacy
- Compare Native versus old main versus isolated integration candidate in matched runs, and then consider Modern Web Guidance as a **separate** ablation.
- Include repeated independent runs with matching model/effort/source/evaluator/environment; no reused capture bytes; report interrupted/quota/capacity states separately.
- Distinguish provider-official usage from local transcript counters, worker overlap and unmeasured A2A overhead. No causal efficiency claim from Free Tier percentage alone.
- Before sharing results, use the opt-in `scripts/export-benchmark.mjs` allowlist output, inspect it manually, and do not upload raw brain ZIPs, cookies or database secrets.

## 6. Merge policy
- All 12 original feature PRs #16–#27 and integration PR #29 are **Merged to `v2.0.1`**. Git tree was preserved; implementation issues #3–#14 are closed with outstanding external acceptance tracked in issue #15.
- Keep `main` unchanged. The `v2.0.1` branch contains the combined implementation; do not publish an npm/GitHub release or promote the version branch to `main` until real external acceptance and Antigravity install/browser smoke checks have passed.
- The reviewed features are integrated in `v2.0.1` via #29 **and** individually recorded as merged PRs #16–#27; do not merge them again. After independent acceptance and benchmarks pass, open a **single** PR `v2.0.1 → main` and merge it only with explicit user authorization. See [v2.0.1 traceability](./V2_0_1_TRACEABILITY.md).
