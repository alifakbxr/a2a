# Reproducible Antigravity A/B evaluation (issue #3)

**Representative candidate suite:** [six PILAH evaluation scenarios](../tests/fixtures/pilah-eval-scenarios.json) cover zero-call edits, cross-file impact, workspace denial, negative acceptance, stale handoff and complex UI/API work. The checked-in fixture is a reproducible *candidate*, not a signed independent evaluator-owned registry. Copy and freeze it outside the agent-controlled workspace before scoring. Every scenario starts `not_tested`; do not infer success or provider usage.

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

Supported variants: `native`, `pilah-on-demand`, `pilah-always-on`, plus corresponding subagent, swarm and teamwork variants. Swarm/Teamwork availability depends on the current Antigravity plan and should never be presumed for Free Tier.

Values are medians with min/max, but interpretation depends on independent evidence. A `passed` verdict must be assigned by an external evaluator, not the implementation agent itself. Unknown/skipped are not passes. The final `result.usage.total_tokens` is cumulative for streaming sessions; do not sum step records or add cache-read/thinking to it.

**Privacy:** transcripts can contain prompts, paths and secrets; store captures locally and never commit or publish unreviewed copies. The aggregated output includes metadata but not raw transcript content.

**Sources:** [Antigravity headless output](https://antigravity.google/docs/cli/headless/), [plan quotas](https://antigravity.google/docs/plans), [Google DeepMind AlphaProof Code: independent verification](https://deepmind.google/blog/introducing-alphaproof-code/).

**Limitations:** Comparison readiness means repeated captures exist; it does not automatically prove randomization, identical external conditions, causal improvements or quota equivalence.

**Pre-vNext correction (18 Nov 2026):** This evaluator now refuses identical capture bytes reused as independent runs (SHA-256 collision of the entire captured result) and rejects per-run setup overrides that contradict the frozen manifest. `comparability.capture_repetitions_ready` only indicates sufficient **distinct captures**; `comparability.ready` remains **false** until independence, acceptance evidence and provider usage are established out of band. Distinct files alone still do not prove statistical or causal equivalence. No winner can be declared from self-reported weekly Free Tier percentages.

## Distribution scope

The evaluator at `benchmarks/ab-evaluate.mjs` is intentionally **source-checkout-only**. It is excluded from the installable npm tarball to avoid distributing optional research code in the runtime plugin. Clone or download the source repository at a pinned revision to run the command above; this does not require a new dependency. The packaged PILAH MCP and CLI remain independent of the benchmark runner.

## Behavioral reliability comparison — current candidate

The v2.0.1 behavioral changes include a truthful completion summary, explicit checkpoints, native error guidance and parallel-ownership gating. To evaluate their effect, hold the prompt, source, model, effort, tool permissions and acceptance registry fixed across **Native, prior PILAH baseline and v2.0.1**. Run at least **five independent trials per variant**; randomize order and measure user-visible acceptance outcomes as well as official usage when exposed. Reused transcripts, simulated F01–F18 proofs or browser-tab reloads cannot substitute for independent execution. **No matched repeated benchmark proving an improvement has been completed as of 18 November 2026**; issue #15 remains open.
