> **Historical research record:** Product terminology is standardized to PILAH. Earlier test results and open/closed issue states describe historical snapshots, not current release eligibility.

# Historical Integration Audit — Merged into v2.0.1

The original pre-vNext audit from `main` at `b622110d0feabf469390a41f3c93338053b3c7b6` was superseded by an explicit request to integrate directly into the `v2.0.1` branch, **not vNext**.

- Original feature PRs: #16–#27, all individually merged into `v2.0.1` after integration PR #29, retaining the same source tree.
- Integration PR: #29, merged to `v2.0.1` on 2026-11-18.
- Merge commit: `049a5297fbd4c542918f4a23e9676d5e2b0530ce`.
- `package.json` and `plugin.json` both identify version `2.0.1`.
- Default `main` remains unchanged.
- CI after all twelve individual merges: the repository's current GitHub URL — success. Implementation issues #3–#14 are closed; actual external validation remains open in #15.
- This branch merge is **not** an npm publish, GitHub version tag, GitHub Release, or proof that PILAH is production-ready.

## Remaining independent release gates

1. Execute all 18 frozen STOCKROOM negative-control scenarios against both generated applications using isolated real HTTP, browser and database test harnesses. The fixtures in tests/fixtures are specifications, not a substitute for executions.
2. Validate a real installed Antigravity plugin with MCP tools, workspace authorization, browser workflow and source/build evidence freshness.
3. Compare independent model usage, worker overlap, failure recovery and actual application quality against frozen controls.
4. Confirm the external frozen acceptance registry and trusted evaluator keys are protected from the coding agent.
5. Obtain separate authorization before publishing packages, creating a public release, or promoting to `main`.

See [Independent Acceptance Runbook](./INDEPENDENT_ACCEPTANCE_RUNBOOK.md).

## Historical boundary (current as of 18 November 2026)

This document records the **earlier #16–#29 integration**, not the latest feature changes. Subsequently PR #36 merged six behavioral implementation issues #30–#35 into `v2.0.1` at `67ea5888caf61751952c8a7daa1eb222d738d4b6`. Post-merge CI passed 4/4 jobs with 213/213 Node tests on Ubuntu Node 22. `main` was not modified; external release acceptance is still open in #15. See [current traceability](V2_0_1_TRACEABILITY.md).
