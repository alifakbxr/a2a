# Token efficiency evaluation

A2A exposes *estimated* source and response token footprints. It does **not** know the true tokens a model would have used without the plugin. `raw_scope_tokens - response_tokens` is a counterfactual estimate, **not net session savings**. Model-provided cache counters, if available, must be considered separately.

## Controlled A/B protocol (manual Antigravity)

1. Choose at least five representative tasks with independently testable acceptance criteria (simple edit, bug fix, multi-module change, test repair, security-sensitive edit).
2. Record model, reasoning configuration, Antigravity version, repository revision, test fixtures, permissions and task prompt; use a fresh conversation per attempt.
3. Run each task from the **same repository snapshot** under:
   - **A: Native** — A2A disabled.
   - **B: On-demand** — A2A enabled with no automatic tools (manually invoke only when needed).
   - **C: Always-on** — explicit opt-in to adaptive A2A instructions.
4. Use comparable cold/warm cache conditions, randomize variant order, and repeat runs. Record token counts from the *same authoritative model/session provider* where available.
5. Count all input, output, cache-read, tool-result and retry tokens consistently; also track tool-call count, latency, automated test outcomes and correctness. Do not compare A2A's source-size heuristic against native billed usage.
6. Report median and spread per task type. Compare both **net tokens** and **task quality**. Include failures and sessions needing additional iterations.
7. Do not publish a specific percent savings or "zero false completion" claim without reproducible logs and methodology.

## Interpretation

- A2A may help on complex dependency changes, while increasing token cost for simple edits.
- The code skeletonizer removes comments and blank lines but **does not remove function bodies**; callers may still require full source.
- Prefer a short context query before reading full files; avoid duplicate skeleton + full file reads.
- For existing installs with persisted `always-on` settings, switch to on-demand explicitly: `a2a mode on-demand` or `node scripts/a2a.mjs mode on-demand`.
- Session transcript metrics depend on undocumented Antigravity event shapes; treat them as diagnostic, not billing-grade.
