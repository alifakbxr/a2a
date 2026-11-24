> **Historical research record:** Terminology has been standardized to PILAH. Dates, CI results and observed limitations refer to the source revision investigated at that time, not necessarily the current plugin.

# Observable Agent-Trace Comparison

The optional local-only comparison from issue #12 counts observable Antigravity events. **It cannot inspect hidden model thinking or establish causal speed/quality improvements.**

## Usage

```bash
node scripts/compare-agent-traces.mjs native-transcript.jsonl pilah-transcript.jsonl
```

Input is local `transcript.jsonl` material containing available `USER_INPUT`, `PLANNER_RESPONSE`, `GENERIC` and `ERROR_MESSAGE` records. Repeated planner `step_index` entries are deduplicated. Output is bounded counts, sanitized tool names, timestamps and coverage warnings — **not prompts, arguments or model responses**.

A larger number of tool calls is not automatically lower quality; repeated source reads can be necessary after edits. Pair this comparison with independent acceptance results, matched task/model/effort/permissions and official CLI usage if available. Baseline Native/PILAH output quality has **not** been causally established by the current CI.

Private transcripts may contain login credentials; do not commit unreviewed originals. See [Decision review](AGENT_DECISION_REVIEW.md), [Intervention ledger](INTERVENTION_LEDGER.md), [benchmark protocol](AB_EVALUATION.md) and release blocker #15.
