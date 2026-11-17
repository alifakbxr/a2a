# Reproducible Antigravity A/B evaluation (issue #3)

This read-only evaluator consumes completed official `agy -p ... --output-format json` or `stream-json` captures. It **does not launch model runs**, claim equal quotas, or overwrite either benchmark application.

Capture with the same prompt, task repository snapshot, model, thinking effort, permissions and independent acceptance suite. Record those settings in a manifest. Use a fresh workspace per run. Alternate or randomize order; at least five repetitions per variant are recommended. Keep source, environment and success criteria immutable.

Example `manifest.json`:

```json
{
  "setup": {
    "task_id": "stockroom-eval-v1",
    "snapshot_sha": "pinned-source-commit",
    "model": "gemini-3.8-flash",
    "effort": "high",
    "antigravity_version": "1.5.7",
    "permissions": "request-review",
    "evaluation_version": "acceptance-v1"
  },
  "scenarios": ["checkout-idempotency", "offline-reopen", "cross-tenant-isolation"],
  "runs": [
    {
      "variant": "native",
      "repeat": 1,
      "capture": "native-run-1.json",
      "acceptance": {
        "checkout-idempotency": "passed",
        "offline-reopen": "not-tested",
        "cross-tenant-isolation": "failed"
      }
    }
  ]
}
```

Run:

```sh
node benchmarks/ab-evaluate.mjs manifest.json > aggregated.json
```

Supported variants: `native`, `a2a-on-demand`, `a2a-always-on`, plus corresponding subagent, swarm and teamwork variants. Swarm/Teamwork availability depends on the current Antigravity plan and should never be presumed for Free Tier.

Values are medians with min/max, but interpretation depends on independent evidence. A `passed` verdict must be assigned by an external evaluator, not the implementation agent itself. Unknown/skipped are not passes. The final `result.usage.total_tokens` is cumulative for streaming sessions; do not sum step records or add cache-read/thinking to it.

**Privacy:** transcripts can contain prompts, paths and secrets; store captures locally and never commit or publish unreviewed copies. The aggregated output includes metadata but not raw transcript content.

**Sources:** [Antigravity headless output](https://antigravity.google/docs/cli/headless/), [plan quotas](https://antigravity.google/docs/plans), [Google DeepMind AlphaProof Code: independent verification](https://deepmind.google/blog/introducing-alphaproof-code/).

**Limitations:** Comparison readiness means repeated captures exist; it does not automatically prove randomization, identical external conditions, causal improvements or quota equivalence.
