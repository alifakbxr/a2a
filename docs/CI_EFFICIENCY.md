# PILAH: efficient CI and evidence-first tuning

## GitHub Actions budget

This repo deliberately separates **ordinary verification** from **full compatibility certification**. Each lane runs the **same** syntax, complete Node test suite, release-contract checks, SQLite smoke, and npm-tarball hygiene checks.

| Trigger | OS / Node | Jobs | Purpose |
| --- | --- | ---: | --- |
| PR targeting main | Ubuntu / Node 24 | **1** | Fast complete regression suite for routine code review |
| Push to main | Ubuntu, macOS, Windows / Node 24 | **3** | Cross-platform main-branch smoke plus full suite |
| Manual `workflow_dispatch` | Ubuntu, macOS, Windows × Node 22, 24, 26.13.1 | **9** | Release candidate, runtime-specific changes, broad portability investigation |

Earlier workflows ran **9 jobs on each PR and each main push**. The optimized routine configuration removes **8 jobs per PR (88.9%)** and **6 per main push (66.7%)** while retaining all existing suite steps. It does **not** reduce the number of test cases within a job. These percentages count configured CI jobs, **not** runtime, runner charges, completion time or model tokens. All jobs are subject to GitHub availability; avoid claims of passed platforms until the actual run completes.

Pull requests are the only automated test entry for feature branches; there is no redundant feature-branch `push` trigger. New commits cancel older in-flight runs of the **same** PR, while main pushes use a separate concurrency group. Nothing automatically publishes packages or tags releases. `npm` / GitHub Packages publication retains its independent authorization checks.

**Manual full-matrix run:** GitHub repository → Actions → *CI Test & Quality Gate* → *Run workflow*, selecting the intended ref. Run before release or after platform/runtime compatibility changes. Passing the smaller routine matrix is not a substitute for this check.

## Evaluate efficiency without overengineering

| Suggestion | Decision | Reason |
| --- | --- | --- |
| Native-first, one scoped MCP call on uncertainty | **Keep** | PILAH already exposes four public tools, only context is eager, others lazy |
| Small, reviewable native Bash/Node/Python scripts | **Allow when useful** | Batch known, authorized operations and return concise redacted results; no blanket code-mode claim |
| Short rules, skill progressive disclosure | **Keep; ablate experimentally** | Measure prompt and instruction size and task outcomes; do not delete security guidance merely to meet token goals |
| Antigravity `/teamwork` / native Git worktrees | **Opt-in** | Use only for independent work with separate ownership; never assume model-tier entitlement or automatic free multi-model routing |
| KV-cache optimization / trajectory compaction | **Host-dependent, not PILAH-controlled** | Stable small instruction prefix helps; no guaranteed hit ratio, discounts or provider usage API |
| Sidecar daemons, polling, background workers | **Do not add** | No recurring task requires an always-on new process; may increase cost/security surface |
| Generative UI progress boards | **Native host concern** | No need for a renderer or persistent UI process within a code-analysis plugin |
| Local structured architecture map | **Reuse existing** | Use project architecture files and scoped source graph; avoid re-indexing on every turn |
| Deterministic test back-pressure | **Keep** | Never replace named tests, security, negative paths, accessibility, integration evidence with a passing build |
| Utility-scored long-term memory / automatic prompt mutation | **Deferred until independently measured** | Self-reinforcing incorrect history and private transcript leakage are more harmful than missed optimization |

Official Antigravity features: [Teamwork](https://antigravity.google/docs/teamwork/), [native worktrees](https://antigravity.google/docs/cli/projects/), [plugin skill/MCP/hook architecture](https://antigravity.google/docs/build-plugins/).

## Closed-loop evaluation, without an autonomous self-modifier

1. Freeze a representative task suite: simple edit, cross-file issue, security denial, integration regression, debugging and complex feature.
2. Compare Native and PILAH with identical snapshot, model, effort, permissions, available tools, and known independent outcomes. Counterbalance run order and run at least **five** distinct trials per variant.
3. Use actual provider-reported input/output/total tokens, cache-read fields (never double count), elapsed seconds, tool calls, failed attempts, and **accepted successful outcomes**. Mark unknown fields unknown. Report `cost per accepted task`; never use token-per-turn as a substitute for completion quality.
4. Test instruction *ablation* one line/group at a time. Keep an edit only if independent correctness and security do not regress **and** efficiency improves meaningfully.
5. Preserve failed experiments and frozen control cases. Do not let the coding agent create or sign its own passing acceptance receipts. Existing `benchmarks/ab-evaluate.mjs` deliberately reports `comparability.ready=false` without independent evidence.
6. No automatic production prompt updates, agent teams, persistence, or repo writes from a benchmark. Propose a reviewed PR with regression tests instead.

**Not verified for PILAH:** numerical claims such as 1M→60k tokens, 50% lower MCP overhead, >90% cache hit rate, or 2× less Bash-versus-MCP token usage. Such results are workload- and host-specific until tested. Separate source-level CI from installed Antigravity acceptance and frozen STOCKROOM F01–F18 evidence (see [main validation backlog](MAIN_VALIDATION_BACKLOG.md)).

## Boundaries

No new third-party dependencies or long-running services; minimum complete change, not minimum line count. Never suppress tests, redact failures, fabricate independent passes, bypass approvals/workspace trust, or change settings solely to look better in a benchmark.
