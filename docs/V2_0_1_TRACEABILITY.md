# v2.0.1 Integration Traceability and Promotion Gate

> **State:** Integrated into `v2.0.1` only; **NOT released**, not benchmark-validated, not merged into `main`.

## Source and immutable baseline

- Repository: [alifakbxr/a2a](https://github.com/alifakbxr/a2a).
- Previous baseline: `main` at `b622110d0feabf469390a41f3c93338053b3c7b6`. Preserve it for the benchmark.
- Version branch: [`v2.0.1`](https://github.com/alifakbxr/a2a/tree/v2.0.1).
- Combined source integration: [PR #29](https://github.com/alifakbxr/a2a/pull/29), **merged to `v2.0.1` only**.
- Integration merge commit: `049a5297fbd4c542918f4a23e9676d5e2b0530ce`.
- Both `package.json` and `plugin.json` declare `2.0.1`. No npm publication, GitHub release, or release tag is implied.
- Latest cross-platform CI successful at `89e6f2ca579edf6a46f1e63c697e461ae9146b65`: [GitHub Actions run #44240903023](https://github.com/alifakbxr/a2a/actions/runs/44240903023). GitHub Actions tested Ubuntu Node 22/24, Windows Node 22, macOS Node 22.
- All feature PRs #16–#27 remain **Draft/Open**, originally targeting `main`; their **changes were integrated via PR #29, not by individually merging each feature PR**. Do not attempt to merge them again into `v2.0.1` or `main` without reconciliation.

## Original PR → integration traceability

| Issue | Original PR (Draft/Open) | Scope incorporated into PR #29 |
| --- | --- | --- |
| [#3](https://github.com/alifakbxr/a2a/issues/3) | [#16](https://github.com/alifakbxr/a2a/pull/16) | Reproducible A/B evaluator, conservative official usage and repeated-run checks |
| [#4](https://github.com/alifakbxr/a2a/issues/4) | [#17](https://github.com/alifakbxr/a2a/pull/17) | Signed independent acceptance gate, user-pinned frozen acceptance registry |
| [#5](https://github.com/alifakbxr/a2a/issues/5) | [#18](https://github.com/alifakbxr/a2a/pull/18) | Historical token provenance and worker overlap limitations |
| [#6](https://github.com/alifakbxr/a2a/issues/6) | [#19](https://github.com/alifakbxr/a2a/pull/19) | Privacy-safe MCP error diagnostics and authorization recovery |
| [#7](https://github.com/alifakbxr/a2a/issues/7) | [#20](https://github.com/alifakbxr/a2a/pull/20) | Static impact coverage uncertainty and bounded test candidates |
| [#8](https://github.com/alifakbxr/a2a/issues/8) | [#21](https://github.com/alifakbxr/a2a/pull/21) | Semantic negative controls, browser evidence, 18-case STOCKROOM acceptance **specification** |
| [#9](https://github.com/alifakbxr/a2a/issues/9) | [#22](https://github.com/alifakbxr/a2a/pull/22) | Interrupted run and verification checkpoint recovery |
| [#10](https://github.com/alifakbxr/a2a/issues/10) | [#23](https://github.com/alifakbxr/a2a/pull/23) | Risk-driven financial, inventory, authorization, offline verification prompts |
| [#11](https://github.com/alifakbxr/a2a/issues/11) | [#24](https://github.com/alifakbxr/a2a/pull/24) | Native Teamwork/Swarm/subagent advisor requiring user consent |
| [#12](https://github.com/alifakbxr/a2a/issues/12) | [#25](https://github.com/alifakbxr/a2a/pull/25) | Observable agent trace comparison and independent decision-review metadata |
| [#13](https://github.com/alifakbxr/a2a/issues/13) | [#26](https://github.com/alifakbxr/a2a/pull/26) | A2A intervention ledger without causal claims |
| [#14](https://github.com/alifakbxr/a2a/issues/14) | [#27](https://github.com/alifakbxr/a2a/pull/27) | Opt-in, privacy-limited benchmark report export |

**Important integration detail:** #17, #21 and #24 modified `src/engine.mjs`, `src/tools.mjs`, and generated MCP schemas; #17 and #23 modified `src/verification.mjs`. Their handlers/contracts were manually reconciled into PR #29 and validated together. Therefore, the source of truth for the combined version is **the `v2.0.1` branch**, not any individual PR head.

## Promotion requirements: v2.0.1 → main

All conditions below must be independently verified before preparing the final pull request:

- [ ] All 18 frozen STOCKROOM scenarios (F01–F18) executed against isolated *running applications* with real HTTP/browser/backend/database assertions. The checked-in scenario JSON is a specification, not passing evidence.
- [ ] Separate evaluator-controlled scenario registry, pinned signing keys, artifact provenance and build/source freshness verified; unauthorized or missing evidence fails closed.
- [ ] Real Antigravity installation and MCP smoke tests completed using the `v2.0.1` branch, with workspace permissions and browser behavior confirmed.
- [ ] Controlled A/B benchmark completed against frozen `main` and Native using comparable models, prompts, environments, repeated runs, official usage where available, and independent acceptance results.
- [ ] Privacy and negative-control review completed; no high-severity regression remains.
- [ ] Final `v2.0.1` commit passes combined CI and release contract checks.
- [ ] **Explicit human approval** to promote the version branch to `main`.

Only after those gates pass, **create one PR with base `main` and head `v2.0.1`**. Do not merge, tag, publish to npm, or create a GitHub Release automatically. Following that merge, separately reconcile/close the twelve original Draft PRs with clear notes that their changes were incorporated through #29 and the final version PR, rather than marking them individually merged.

See [Release Engineering](./RELEASE.md) and [Independent Acceptance Runbook](./INDEPENDENT_ACCEPTANCE_RUNBOOK.md).

## Current decision

**Feature implementation integration: completed.** **Cross-platform CI: passed at the cited commit.** **Independent live acceptance/benchmark: not completed.** **Promotion to main: blocked until approval and evidence.**
