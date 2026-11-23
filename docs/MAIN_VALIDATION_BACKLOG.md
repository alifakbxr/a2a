# Main validation backlog — A2A v2.0.1

**Updated:** 23 November 2026. **Main promotion:** [PR #105](https://github.com/alifakbxr/a2a/pull/105), merge commit `733c0cb0f4218f18278c4df5d7649c66485c04f9`.

The maintainer explicitly chose to **merge into main first, test from main, and close the old release-gate issues**. Administrative closure does not mean that outstanding external tests passed. This document records their exact outstanding scope independently of issue state.

## Established by automated tests
- The original `v2.0.1` integration commit `b80c39d` passed [9/9 CI](https://github.com/alifakbxr/a2a/actions/runs/45200683112), testing Linux, macOS and Windows × Node 22, 24 and 26.13.1.
- [Main promotion CI](https://github.com/alifakbxr/a2a/actions/runs/45202036041) tests the merge commit. Check the actual run conclusion; do not claim it passed until it completes.
- The original STOCKROOM source archives were syntax-checked (Native 101/101 PHP files; A2A 80/80) but their runtime acceptance was **not** established.

## Unverified and deliberately deferred (prior issues #15, #71, #91, #92)
1. **Installed Antigravity MCP adoption (#71):** exact main version installed; `agy plugin validate --strict`; four A2A tools discoverable; workspace permission-denial negative control; manually exercise safe calls; unforced qualified cross-file task and trivial no-call control; independently inspect parent/subagent observable traces. Do not infer token savings from call counts.
2. **Context Guardian (#91):** verify default-off, explicit opt-in, absolute Node binary under desktop NVM, other hooks preserved, clean disable, no automatic compact, and live per-invocation latency/CPU/prompt injection overhead. Document the user-global hooks configuration exception; do not assert token savings from step heuristics.
3. **Routing and economy claims (#92):** at least five matched Native versus A2A real-host trials per qualified high-risk task, matched model and effort, counterbalanced task order, independently graded task outcomes and negative controls. Use official token usage only when available; otherwise record unknown. No preemptive savings claim.
4. **Independent STOCKROOM F01–F18 (#15):** provision isolated PHP HTTP application, required PHP extensions and DB driver, real two-connection concurrent last-stock and transfer races, full browser process restart/offline recovery, tenant and role denial, refund/ledger/payment reconciliation, exactly-once retries, source/build binding, and frozen independent negative-control registry. The executable scenario definitions are in `tests/fixtures/stockroom-acceptance-18.json` and `docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md`.
5. **External release eligibility:** independent signed evidence, frozen evaluator-owned acceptance registry, privacy review, maintainer approval of the exact release commit and successful authorization checks. Until then **no tag, npm or GitHub package publication and no production certification**.

## Disposition of original issues

Old pre-main issues #15, #71, #91 and #92 can be closed at the maintainer's explicit request with reason `not_planned` / superseded, **not `completed`** for any unexecuted external test. This tracks deferral, not proof of compliance. Re-open or file focused follow-up issues when host-run results identify regressions.

## Interpretation

**Merged into main ≠ tested in real IDE ≠ independently accepted ≠ published.** Historical documents stating that main remained frozen are dated snapshots superseded by this document and PR #105. The A2A source promotion is complete; independent release validation remains pending.
