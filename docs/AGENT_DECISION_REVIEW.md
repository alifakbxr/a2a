# Independent Observable Agent-Decision Review

**Purpose:** inspect *observable* Antigravity tool and work decisions, **not hidden model reasoning**. This optional source-checkout utility was introduced for [issue #12](https://github.com/alifakbxr/a2a/issues/12).

## Local usage

```bash
node scripts/review-agent-decisions.mjs local-transcript.jsonl independent-review.json
```

The external review JSON identifies `reviewer.role="independent"` and annotations with `step_index`, `area` (planning, diagnosis, tool-selection, verification, error-recovery, handoff), `grade` (supported, incomplete, contradicted, not-observable) and opaque `evidence_ref` such as `trace:step10`.

The utility validates that referenced observable steps exist and summarizes **reviewer-reported judgments**. It cannot certify reviewer independence, inspect hidden chain-of-thought, authenticate raw transcript observations, or demonstrate that an A2A intervention caused better code. Store transcripts privately; remove credentials and user content before any sharing.

**Current context:** behavioral reliability [PR #36](https://github.com/alifakbxr/a2a/pull/36) merged into `v2.0.1`, with local MCP/SQLite E2E passing. Live Antigravity/18-case acceptance remains open in [#15](https://github.com/alifakbxr/a2a/issues/15). See [5 Whys](BEHAVIORAL_5_WHYS_V2_0_1.md) and [A/B protocol](AB_EVALUATION.md).
