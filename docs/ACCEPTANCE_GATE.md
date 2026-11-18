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
