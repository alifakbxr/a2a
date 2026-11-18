# Independently authorized A2A package releases

**Status:** Fail-closed on `v2.0.1`. This document describes a gate, **not approval to release**.

Both `.github/workflows/publish-npm.yml` and `.github/workflows/publish-github-package.yml` run `node scripts/release-authorization.mjs` **before publication**. A tag, manually dispatched workflow, passing CI, or GitHub Release announcement alone cannot authorize publication.

## Mandatory release conditions

1. The actual checkout commit must equal the current `origin/main` HEAD; the source repository must be `alifakbxr/a2a`.
2. A tag-triggered release must be named exactly `v<package.json version>`; manual dispatch must run on `refs/heads/main`.
3. GitHub repository variable `A2A_RELEASE_APPROVED_SHA` must equal that exact 40-character commit. No default approval or `force_publish` override exists.
4. Three independent, **externally configured** GitHub secrets are required:
   - `A2A_RELEASE_EVIDENCE_B64`: Base64-encoded UTF-8 JSON release evidence manifest, including the `release_target` and `release_approval` records described below.
   - `A2A_RELEASE_TRUST_KEYS_B64`: Base64-encoded JSON object mapping evaluator/reviewer key IDs to pinned Ed25519 public-key PEM strings.
   - `A2A_RELEASE_REGISTRY_B64`: Base64-encoded JSON frozen acceptance registry (`a2a-acceptance-registry-v1`). Must independently pin all F01–F18 scenario requirements and evidence types.
5. Every frozen scenario must be a verified signed, complete, matching-revision machine-evidence pass. The external review must affirm real Antigravity installation, privacy review and repeated benchmark evidence.
6. A **second detached Ed25519 release approval signature** must bind the repository, commit, package version, accepted source revision, registry digest, completion flags and approval time. The approver private key must be kept **outside the repository and CI**. Approval must be no more than 90 days old and not future-dated by more than five minutes.

The gate blocks unless **all** checks pass. The trusted registry and keys **must not** be created from a generated application, coding agent or a user-controlled fixture within the repository.

## Manifest extension

The `A2A_RELEASE_EVIDENCE_B64` manifest contains the usual `revision`, `evaluator`, `scenarios`, and `critical_defects` fields assessed by `assessRelease`. Additional externally controlled fields:

```json
{
  "release_target": {
    "repository": "alifakbxr/a2a",
    "commit_sha": "<40-character approved main commit>",
    "version": "2.0.1",
    "acceptance_registry_sha256": "<hex SHA-256 of JSON.stringify(pinned registry)>",
    "real_antigravity_validation": true,
    "privacy_reviewed": true,
    "repeated_benchmark_verified": true
  },
  "release_approval": {
    "key_id": "<pinned reviewer public-key ID>",
    "approved_at": "<ISO-8601 UTC date-time>",
    "signature": "<Base64-encoded detached Ed25519 signature>"
  }
}
```

The second signature must cover precisely the UTF-8 bytes returned by `releaseApprovalPayload({release_target,revision,approved_at})` exported from `scripts/release-authorization.mjs`. It is intentionally separate from each scenario's `attestationPayload`, because those evidence signatures bind a scenario to a tested source revision, not necessarily to the package commit being published.

**Important:** The acceptance registry digest is over `JSON.stringify(registry)`, not pretty-printed file bytes. Read the actual registry JSON and sign the exact payload without modifying the fields afterwards. Test and reviewer public keys may be shared for verification; **never place private signing keys or raw Antigravity archives in the repository, workflows, or logs**.

## Negative controls versus positive acceptance

The two **frozen, known-defective** STOCKROOM benchmark applications are negative-control baselines. Do **not** edit them to manufacture green test results and do **not** mark a baseline app as passing F01–F18 when it demonstrably fails a requirement. The independent assessor must first report their actual observed failures and A2A's classification quality without false passes.

A release-eligible `assessRelease` manifest must instead contain **genuinely passed, independently pinned acceptance criteria for the releasable A2A candidate**, including all F01–F18 semantic failure-mode checks. Criteria may verify that A2A correctly detects or refuses unsupported claims from negative-control applications; they must not pretend the known-defective applications satisfy financial, concurrency or security invariants. If the assessor requires a separate new generated application to pass the functional scenarios, that application must be executed and evaluated independently. The external registry's requirement text, signed report semantics and testing target must agree. An arbitrary rewording of a known failure as a success is not acceptable evidence.

## Independent review procedure

- Preserve and hash the four benchmark source ZIPs, keeping them private. Run F01–F18 with actual isolated HTTP/browser/database operations; verify overlapping independent DB transactions and full browser-process restart as required.
- Run at least five controlled, **independent** trials per Native / baseline / v2.0.1 variant using identical task, model, effort and environmental constraints. Do not fabricate or extrapolate missing provider metrics.
- Have a reviewer outside the implementation agent's environment freeze F01–F18 requirements and Ed25519 public keys, validate the test results, sign the scenario receipts, and separately approve the exact main commit.
- Only **after** explicit human approval and successful independent acceptance: merge `v2.0.1` into `main` through the agreed PR, update the external GitHub variable/secrets, and publish the matching signed tag/release.
- Re-run final CI and inspect the actual npm tarball. A validated manifest is **not** proof that the evaluator was honest or that all production bugs have been eliminated.

## Tests and limitations

`tests/release_authorization.test.mjs` constructs **synthetic signed fixtures** to prove the gate correctly checks signatures, invalid cases, wrong commits, wrong refs and missing approvals. Those fixtures are not real STOCKROOM execution evidence, and they never cause CI to publish anything.

An unconfigured GitHub repository is **correctly denied**. External GitHub secrets, independent keys, acceptance runs, successful real Antigravity installation and explicit user approval cannot be generated by repository unit tests. Do not mark issue #15 complete based on code coverage alone.

## Current candidate and behavioral scope (18 November 2026)

The latest merged **behavioral implementation** documented here is [PR #36](https://github.com/alifakbxr/a2a/pull/36) on `v2.0.1`, commit `67ea5888caf61751952c8a7daa1eb222d738d4b6`, with [4/4 post-merge CI jobs passing](https://github.com/alifakbxr/a2a/actions/runs/44325007116). Six implementation issues #30–#35 are closed. The release authorization script is unchanged by that merge: it still requires an **approved `main` SHA**, independently controlled evaluator keys, signed frozen acceptance evidence, and a separate reviewer Ed25519 signature. **Passing behavioral CI does not satisfy any external F01–F18 receipt, live Antigravity, privacy review or human approval by itself.** [Issue #15](https://github.com/alifakbxr/a2a/issues/15) remains open and no publication was performed.
