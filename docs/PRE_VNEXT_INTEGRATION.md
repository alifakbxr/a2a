# Historical Integration Audit — Merged into v2.0.1

The original pre-vNext audit from `main` at `b622110d0feabf469390a41f3c93338053b3c7b6` was superseded by an explicit request to integrate directly into the `v2.0.1` branch, **not vNext**.

- Original feature PRs: #16–#27, all individually merged into `v2.0.1` after integration PR #29, retaining the same source tree.
- Integration PR: #29, merged to `v2.0.1` on 2026-11-18.
- Merge commit: `049a5297fbd4c542918f4a23e9676d5e2b0530ce`.
- `package.json` and `plugin.json` both identify version `2.0.1`.
- Default `main` remains unchanged.
- CI after all twelve individual merges: https://github.com/alifakbxr/a2a/actions/runs/44248690103 — success. Implementation issues #3–#14 are closed; actual external validation remains open in #15.
- This branch merge is **not** an npm publish, GitHub version tag, GitHub Release, or proof that A2A is production-ready.

## Remaining independent release gates

1. Execute all 18 frozen STOCKROOM negative-control scenarios against both generated applications using isolated real HTTP, browser and database test harnesses. The fixtures in tests/fixtures are specifications, not a substitute for executions.
2. Validate a real installed Antigravity plugin with MCP tools, workspace authorization, browser workflow and source/build evidence freshness.
3. Compare independent model usage, worker overlap, failure recovery and actual application quality against frozen controls.
4. Confirm the external frozen acceptance registry and trusted evaluator keys are protected from the coding agent.
5. Obtain separate authorization before publishing packages, creating a public release, or promoting to `main`.

See [Independent Acceptance Runbook](./INDEPENDENT_ACCEPTANCE_RUNBOOK.md).
