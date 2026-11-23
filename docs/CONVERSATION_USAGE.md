# Understanding A2A token reports

## What the numbers mean

A2A reports in clear, accessible **English by default** so people around the world can read the figures without understanding JSON. **No A2A install date is required.** The report reads existing Antigravity transcript files locally; conversations created long before the plugin was installed can appear.

Three types of values are deliberately separated:

1. **Official Antigravity usage:** `usage.total_tokens` from a CLI JSON result. This is the only field described as confirmed; it applies to the captured run/conversation, not to every older IDE chat. Cache-read and thinking counts are not added again.
2. **History from local transcripts:** per-step `input_tokens`, `cache_read_tokens` and `output_tokens` counters. Those fields use an undocumented internal format. A2A displays two possible interpretations of the totals; neither is labeled an exact bill or a precise Gemini context window.
3. **This A2A report:** its own output size (UTF-8 bytes and a rough character-based token estimate). Running the report from a terminal does **not** call Gemini. If an agent reads the report, the actual additional model usage is only reflected after a model step finishes. A2A cannot measure tokens of an in-progress model step or separate its exact attributable cost.

`a2a_calls_seen` is based on recognizable calls in transcripts. A zero means no A2A call was found in the available log, **not** proof that A2A was uninstalled. No log content is sent to an external server by the reporting code.

## Commands

```bash
node scripts/a2a.mjs tokens
node scripts/a2a.mjs tokens --limit 5
node scripts/a2a.mjs tokens --current
node scripts/a2a.mjs tokens --conversation <conversation-id>
node scripts/a2a.mjs tokens --include-subagents
node scripts/a2a.mjs tokens --json
node scripts/a2a.mjs tokens --usage-file agy-result.json
```

Inside the agent, call `a2a_context(action="tokens", history_scope="current")` for the latest session, or explicitly `history_scope="all"` for historical summaries.

## Privacy and coverage

- Reads `transcript.jsonl` only, not full reasoning transcripts or artifact contents. Scanning is requested explicitly; no background history import.
- Subagent records are excluded from the default aggregate because the parent may also include their usage; use `--include-subagents` to inspect them separately. Such combined totals may overlap.
- Files from an authorized local Antigravity application directory are read in place. No conversation text is saved to A2A's database.
- A single transcript is limited to 128 MiB; scans cap at 3,000 conversation directories and 1 GiB of files, reporting any omissions. Results may not be exhaustive when logs are missing, rotated, inaccessible, malformed or truncated.
- Duplicate `PLANNER_RESPONSE` records with the same numeric `step_index` are deduplicated; official cumulative usage results are not summed as per-step deltas. Imported official exports supersede local estimates for the same conversation.
- The last session is chosen using A2A's `SessionStart` marker where available, otherwise the newest transcript mtime. The result is not guaranteed to reflect a model step that is currently still running.
- Estimates are not bills, and a saving cannot be inferred without comparable native and A2A runs. For the controlled comparison see [TOKEN_EFFICIENCY.md](TOKEN_EFFICIENCY.md).

## Why there may be a huge token figure

Cached context can be read repeatedly over hundreds of model steps, creating a large *cumulative* counter even when the *current* context window is much smaller. Cached reads may already be included within input usage depending on source schema. We therefore show input/cache/output separately, do not combine internal counters with official reports, and do not assign a dollar value from guessed model rates.

If a conversation has no readable usage counters, the report says so instead of making up an estimate from source code size.

## Behavioral-audit privacy boundary

The user-provided private Antigravity history used for [behavioral analysis](BEHAVIORAL_5_WHYS_V2_0_1.md) contained at least one plaintext login detail; **none of the raw archives or those credentials belongs in this public repository**. This account of past usage is separate from any agent-generated completion evidence. A2A's optional `save_checkpoint` accepts explicit notes, not entire transcripts, and rejects common credential assignments while always marking them **unverified**. For source-aware recovery see [Checkpoint recovery](CHECKPOINT_RECOVERY.md).


### MCP call identity (issue #71)

Historical `a2a_calls_seen` counts **observed MCP invocations only**. It recognizes direct eager names (`mcp_a2a_a2a_a2a_context`), namespaced variants and lazy `call_mcp_tool` with the matching A2A server/tool pair. A native `a2a tokens` diagnostic command is **not** an MCP intervention and must not inflate adoption. This remains tool-call metadata, not a model-selection or token-savings causal estimate. Additional user sessions must be collected locally and safely to prove actual IDE adoption.
