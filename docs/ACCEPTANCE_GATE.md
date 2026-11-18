# A2A Independent Release Assessment (#4)

`a2a_verify(operation="assess")` checks named JUnit/TAP/JSON assertions **only**. It now states `release_ready:false` even when tests pass.

For critical release readiness, use `a2a_verify(operation="assess_release",artifact="reports/release.json")` in an authorized workspace or `node scripts/evaluate-acceptance.mjs release.json [trusted-public-keys.json]` offline.

## Trust configuration
A2A reads **public** Ed25519 evaluator keys from `~/.config/a2a/trusted-evaluators.json` when using the MCP action. A user/independent CI administrator must provision and protect this file **outside the coding agent's project**. Example:

```json
{"ci-reviewer":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"}
```

Do **not** generate or trust a public key submitted inside the implementation repository; the key is only meaningful when controlled independently from the agent being evaluated. Never commit the private signing key.

A release manifest provides `revision`, `evaluator:{"name":"independent-ci","independent":true}`, `scenarios` and `critical_defects`. Each `passed` scenario needs machine evidence of type junit/tap/browser/security/integration/etc. with `outcome:passed`, the current `revision`, an opaque `reference`, `checked_at`, a 64-hex `artifact_sha256`, a positive `assertion_count`, `key_id` and a base64 Ed25519 `signature`.

The signature covers the canonical UTF-8 JSON serialization produced by `attestationPayload({revision,scenarioId,evidence})` in `scripts/evaluate-acceptance.mjs`. The independent test runner must create the payload **after executing and checking its assertions**, then sign it. The code only **verifies signature and metadata**; it does not run the tests itself.

Critical scenarios without an independently verified signature are downgraded to `not-tested`. Stale revision, mismatched evidence types and open critical defects block readiness. Successful evaluation means **eligible for independent review**, not production security certification. A valid signature proves possession of a trusted issuer key, not semantic correctness of the tests.

No A2A tool launches a CI runner, changes filesystem permission, or approves a PR automatically.


## Mandatory frozen acceptance scope

A signed test result is not proof that the agent submitted every required scenario. Release eligibility now fails closed unless an independent user-pinned registry matches all scenario IDs, requirement SHA-256 hashes, critical flags and required evidence types. The agent must not be able to edit the registry or signing keys.

Place the registry at `~/.config/a2a/acceptance-registry.json` outside the generated application workspace:

```json
{"schema":"a2a-acceptance-registry-v1","scenarios":[{"id":"offline-restart","requirement_sha256":"64-character-sha256-of-the-exact-requirement","critical":true,"required_evidence_types":["browser","integration"]}]}
```

The registry is read by `a2a_verify(operation="assess_release")`. The CLI `scripts/evaluate-acceptance.mjs` also accepts an optional pinned-registry path after the trust-keys path.

Without a matching registry, `release_ready` stays false even if all submitted assertions have valid signatures. A true result means eligible for independent review of signed evidence, not proof of test execution or production certification. File permissions and reviewer keys must be protected by the user's OS.

## Behavioral completion versus release gate (v2.0.1)

[PR #36](https://github.com/alifakbxr/a2a/pull/36) added a separate **typed** plan/assessment contract: each criterion may declare `given`, `when`, `then` and `evidence_type`; browser and visual criteria require `viewport`, `ui_state` and `reference`. Planning is `not_tested`. Local `assess` can report passed **named machine assertions** but its `completion.fully_verified` stays false, and local test artifacts cannot independently establish UI/browser, hardware, security or release evidence. `assess_semantic` and `assess_browser` remain **unattested structural reviews**. Only the separately signed, pinned `assess_release` plus the [publish authorization policy](RELEASE_AUTHORIZATION.md) can contribute to release eligibility. F01–F18 external evidence is [still pending](https://github.com/alifakbxr/a2a/issues/15).
