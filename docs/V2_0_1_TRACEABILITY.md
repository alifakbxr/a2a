> **Historical implementation record:** Naming is standardized to PILAH for current documentation; the recorded branch, test results and decisions remain historical rather than claims about present release readiness.

# v2.0.1 Integration Traceability and Promotion Gate

> **State:** Integrated into `v2.0.1` only; **NOT released**, not benchmark-validated, not merged into `main`.

## Source and immutable baseline

- Repository: the existing repository.
- Previous baseline: `main` at `b622110d0feabf469390a41f3c93338053b3c7b6`. Preserve it for the benchmark.
- Version branch: `v2.0.1`.
- Combined source integration: PR #29, **merged to `v2.0.1` only**.
- Integration merge commit: `049a5297fbd4c542918f4a23e9676d5e2b0530ce`.
- Both `package.json` and `plugin.json` declare `2.0.1`. No npm publication, GitHub release, or release tag is implied.
- Historical cross-platform CI after the 12 original feature merges at `1da0c8ff5ecec83a1000e8e57cbeb941fcdc870e` (not the current candidate head): GitHub Actions run #44248690103. GitHub Actions tested Ubuntu Node 22/24, Windows Node 22, macOS Node 22.
- All feature PRs #16–#27 are now **individually Merged into `v2.0.1`**, after their implementation was reconciled and integrated by PR #29. Conflicting feature branches were recorded using Git two-parent merge commits retaining the reviewed combined tree (`83dfa3a653056595b31032584079f613a0b8ec6e`), so there were **no duplicate code changes**. Implementation issues #3–#14 are closed; independent validation remains open in #15.

## Original PR → integration traceability

| Issue | Original PR (Merged to v2.0.1) | Scope incorporated into PR #29 |
| --- | --- | --- |
| #3 | #16 | Reproducible A/B evaluator, conservative official usage and repeated-run checks |
| #4 | #17 | Signed independent acceptance gate, user-pinned frozen acceptance registry |
| #5 | #18 | Historical token provenance and worker overlap limitations |
| #6 | #19 | Privacy-safe MCP error diagnostics and authorization recovery |
| #7 | #20 | Static impact coverage uncertainty and bounded test candidates |
| #8 | #21 | Semantic negative controls, browser evidence, 18-case STOCKROOM acceptance **specification** |
| #9 | #22 | Interrupted run and verification checkpoint recovery |
| #10 | #23 | Risk-driven financial, inventory, authorization, offline verification prompts |
| #11 | #24 | Native Teamwork/Swarm/subagent advisor requiring user consent |
| #12 | #25 | Observable agent trace comparison and independent decision-review metadata |
| #13 | #26 | PILAH intervention ledger without causal claims |
| #14 | #27 | Opt-in, privacy-limited benchmark report export |

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

Only after those gates pass, **create one PR with base `main` and head `v2.0.1`**. Do not merge, tag, publish to npm, or create a GitHub Release automatically. The twelve original feature PRs have already been individually merged to `v2.0.1`; implementation issues #3–#14 are closed with unverified external acceptance consolidated into open tracking issue #15. Do not merge these features again.

See [Release Engineering](./RELEASE.md) and [Independent Acceptance Runbook](./INDEPENDENT_ACCEPTANCE_RUNBOOK.md).

## Current decision

**Feature integration: all 12 original feature PRs and behavioral PR #36 merged into `v2.0.1`.** **Cross-platform CI: passed at the current documented behavioral merge commit.** **Independent live acceptance/benchmark: not completed.** **Promotion to main: blocked until approval and evidence.**

## Behavioral reliability merge and latest audited implementation (18 November 2026)

- Behavioral audit implementation: PR #36 **merged into `v2.0.1`**, squash commit `67ea5888caf61751952c8a7daa1eb222d738d4b6`.
- Six code-level issues **closed**: #30 truthful completion and structured criteria; #31 UI state and Figma/browser acceptance; #32 tool recovery; #33 source-fresh decision checkpoints; #34 independent-file-ownership teamwork; #35 private transcript hygiene and MCP E2E.
- Post-merge Actions run 44325007116: **success 4/4** (Ubuntu Node 22/24, macOS Node 22, Windows Node 22); Ubuntu Node 22: **213/213 passed**.
- Exactly four public MCP tools remain; Node runtime package dependencies unchanged. Two branches remained after merge: `main` and `v2.0.1`.
- `main` baseline at the time of this audit: `b622110d0feabf469390a41f3c93338053b3c7b6`. **No promotion, tag, npm candidate publish, or GitHub Release.**
- Closing implementation issues is **not** the same as independent acceptance. #15 remains the sole external release blocker: native installed Antigravity, frozen real F01–F18, repeated benchmark, independent signing and explicit release approval.

See [behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md), [current contracts](CONTRACTS.md), [docs index](README.md).
