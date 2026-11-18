# Independent acceptance & software release gate (#4)

Run `node scripts/evaluate-acceptance.mjs evidence.json` with **externally evaluated** scenarios. Inputs must name the evaluator, revision, requirements, criticality and evidence (type, outcome, revision, reference, checked_at). Claiming `passed` without evidence for the exact revision is downgraded. Critical unverified scenarios and unresolved/retest-needed critical defects block release. No scores can override a security/financial blocker.

Evidence is declarative and **not cryptographically attested**. This tool does not execute test commands, infer correct assertions from test names, or make a generated app production-ready. Human reviewers must audit the referenced artifacts.

Example input:

```json
{
 "revision":"abc123",
 "evaluator":{"name":"independent-ci","independent":true},
 "scenarios":[{"id":"tenant-isolation","requirement":"One tenant cannot access another store","critical":true,"verdict":"passed","required_evidence_types":["security"],"evidence":[{"type":"security","outcome":"passed","revision":"abc123","reference":"ci/job/123","checked_at":"2026-11-17T09:00:00Z"}]}],
 "critical_defects":[]
}
```

Inspired by DeepMind's human-approved specifications and independent machine checking in AlphaProof Code: https://deepmind.google/blog/introducing-alphaproof-code/ . Ordinary app testing does not provide the mathematical guarantee of formal verification.
