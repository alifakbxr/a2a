# Private Benchmark Report Export

The **opt-in**, source-checkout-only exporter from issue #14 minimizes content before manual release of an A/B aggregate. It does **not** upload or publish anything.

```bash
node benchmarks/ab-evaluate.mjs manifest.json > aggregated.json
node scripts/export-benchmark.mjs aggregated.json > public-candidate.json
```

Only supported `<ab-evaluation-schema-id-from-source>` input can be exported. Output uses an explicit allowlist of recognized variant/status metadata and aggregate numeric measures. Setup prompts, paths, logs, conversation text, user IDs, cookies, credentials and source content are not intentionally emitted.

**Manually inspect every proposed public artifact anyway.** Redaction is not an authorization to share private Antigravity brain ZIPs, original STOCKROOM application snapshots, customer data or model transcripts. Compare actual native/PILAH quality and usage under controlled trials; an exported aggregate is **not** independent acceptance evidence.

Related: [A/B evaluation](AB_EVALUATION.md), [Token efficiency](TOKEN_EFFICIENCY.md), [Security](SECURITY.md), Open release blocker.
