# PILAH — independent validation backlog

**Updated 25 November 2026.** Source `main` uses PILAH `1.0.3`; canonical GitHub repository is `alifakbxr/pilah`. Real IDE and external acceptance are tracked in issues #127 and #128; npm registry publishing remains blocked in issue #133. Historical issue closure is not proof that any external test was executed.

## What automated tests establish

- PILAH rebrand passed the 9-job Node 22/24/26.13.1 × three-OS CI matrix at the PR #107 source revision.
- CI/router optimization passed 3/3 main Node 24 jobs at commit `3b168e3`.
- Original frozen STOCKROOM snapshots passed PHP **syntax** checks (Native 101/101, PILAH 80/80), not live F01–F18. PHP extensions, an isolated DB and browser execution were unavailable.

## Required independent work

1. **Installed PILAH adoption (#71):** use the [independent host runbook](HOST_VALIDATION.md) with H01–H06, then  first run `node scripts/pilah.mjs host-check` on an actual Antigravity machine (CLI-only preflight, not E2E). Then run `agy plugin validate --strict .`, inspect `agy plugin list --json`, check all four `pilah_*` tools in the actual IDE, permission-denial negatives, spontaneous qualified cross-file use, and a trivial no-call control. Inspect actual parent/subagent traces.
2. **Guardian overhead (#91):** default-off, explicit enabling, preserved user hooks, absolute NVM Node binary, clean disable, and measured per-invocation host latency, CPU and token overhead. No automatic compaction.
3. **Native vs PILAH (#92):** at least five counterbalanced trials per variant using the [candidate six-scenario suite](../tests/fixtures/pilah-eval-scenarios.json) frozen outside the agent-controlled repository with matching model, effort, source snapshot, permissions and independent task rubric. Record provider-reported usage if available, elapsed time, turns, tool failures, accepted tasks; report missing usage as unknown.
4. **Acceptance F01–F18 (#15):** run isolated real PHP HTTP/DB/browser scenarios including tenant and role denials, refund/ledger reconciliation, true two-connection concurrency, offline recovery across browser process restarts, exactly-once retries, stale-build checks and frozen independent negative controls. See [scenario fixture](../tests/fixtures/acceptance-18.json) and [runbook](INDEPENDENT_ACCEPTANCE_RUNBOOK.md).
5. **Release authority:** frozen evaluator-owned registry, signed machine evidence, independent privacy review and detached approval bound to the exact commit. Verify with the [fail-closed authorization mechanism](RELEASE_AUTHORIZATION.md).

**Merged to main ≠ installed in a real IDE ≠ independently accepted ≠ published.** No CI PASS, native advice or self-reported transcript substitutes for unexecuted host/app scenarios.

## Current externally owned acceptance (NOT TESTED)

- [ ] Antigravity H01–H06 on an installed host, record version, permissions, exact SHA, and genuine tool-selection traces
- [ ] Five or more counterbalanced Native/PILAH trials per variant using independent, fixed acceptance and official token usage, with missing counters `null`
- [ ] F01–F18 real HTTP/DB/browser negative and concurrency tests with evaluator-owned fixtures, signed evidence and independent privacy review
- [ ] Verify registry uploads/install behavior and independently signed authorization for the exact release commit

No local CI/assistant-generated observations satisfy these checkboxes. Failed, stale, partial or unobserved results remain unaccepted.

## Batch 5 host validation prerequisites

Run the source-level test suite and manual 9-job Node 22/24/26 compatibility matrix. On an actual Antigravity installation, use `pilah host-check`, `agy plugin validate --strict .`, and the H01–H06 protocol; log the exact source SHA. Only an independent evaluator can mark F01–F18, privacy approval, native-vs-PILAH A/B token savings, and registry installation as PASS. No self-signed or synthetic test output satisfies these gates.

## November 25 benchmark and protocol readiness

The current offline evaluator accepts missing official token usage **only as `null`**, never as zero or a source-byte estimate. It reports whether pairs are repeated, counterbalanced, and covered by provider usage; even perfectly balanced locally supplied captures remain `comparability.ready=false` without independent acceptance and host equivalence. Use `node scripts/export-benchmark.mjs <aggregated-report.json>` for a privacy-safe PILAH-format export; raw captures must stay with the evaluator.

The stdio MCP server negotiates the shared tools/resources subset for `2025-03-26`, `2025-06-18`, and `2025-11-25`. The newer `2026-07-28` `server/discover` protocol is NOT implemented or advertised. Live IDE negotiation, H01–H06, and F01–F18 are still required; these source changes do not satisfy external release approval.
