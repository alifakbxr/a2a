# Token measurement and A/B protocol

## Past and current conversations

`a2a tokens` now scans available `~/.gemini/antigravity*/brain/<conversation-id>/.system_generated/logs/transcript.jsonl` entries, including sessions from before A2A existed. It reports each conversation's recent completed model-step counters and totals recorded locally. Model-step counters may not match official usage accounting; two interpretations (cache included/excluded from input) are displayed, **never treated as a confirmed bill**. Imported official CLI JSON supersedes the same conversation's local counters instead of being added twice.

The report itself includes a size estimate for its printed response; **printing it in a terminal makes no Gemini model call**. When the agent reads the report, a subsequent completed model turn is needed before that consumption can appear in Antigravity's logs.

For performance, `a2a_context(action="tokens")` defaults to the latest available conversation; specify `history_scope="all"` explicitly to include other conversations. Historical scanning is local and read-only; model prompts are parsed only for usage metadata, not stored anew.

For explanation of coverage, privacy, limits and accuracy, see [CONVERSATION_USAGE.md](CONVERSATION_USAGE.md).

## What A2A can and cannot measure

**Without a provider usage record:** `a2a tokens` reports only an **estimated workspace source inventory** and **estimated tool payload sizes**. These numbers are **not** consumed context, billable tokens, savings, or the Gemini context window. Net savings, percentages, and USD estimates are intentionally `null`. Existing legacy telemetry rows cannot retroactively prove savings.

**With official Antigravity CLI usage:** `agy --output-format json` provides a run-level `usage` object; `stream-json` provides it in the final `event: result`. A2A validates and displays the official `total_tokens` without summing cache-read or thinking tokens a second time.

```bash
# Only runs a new headless Antigravity task; it does NOT measure an existing IDE conversation.
agy -p "Explain this module without changing files" --output-format json > agy-result.json

# Show the official usage for that completed run plus the separate workspace inventory.
node scripts/a2a.mjs tokens . --usage-file agy-result.json
```

The imported file may contain conversation content. Keep it local and private; do not commit it. Files over 4 MiB and inconsistent usage totals are rejected. A2A does not automatically read arbitrary other conversations.

## Source of truth

Google's [official CLI headless documentation](https://antigravity.google/docs/cli/headless/) defines the `usage` object. For its example, `input_tokens=10,418`, `output_tokens=589`, and `total_tokens=11,007`. `thinking_tokens=551` and `cache_read_tokens=8,113` are reported fields; neither is separately added to `total_tokens`.

Source inventory is estimated from UTF-8 file sizes, not from the live Gemini tokenizer. A2A cannot directly inspect a model's private context or billing records.

## Controlled A/B procedure

1. Choose at least five tasks with measurable acceptance criteria: trivial edit, regression fix, multi-module change, security fix, and verification/report task.
2. Pin repository snapshot, model, Antigravity version, instruction effort, permissions, OS and prompt. Use fresh sessions to prevent prior turns from leaking into the comparison.
3. Run from equivalent snapshots in each mode: **Native** (plugin disabled), **On-Demand**, and **Always-On**. Randomize order and repeat each variant multiple times.
4. Capture the official CLI JSON result for every run. Use `usage.total_tokens` consistently as the per-run reported metric; separately report `cache_read_tokens`, `thinking_tokens`, `duration_seconds`, number of turns, tool calls and retries.
5. Record acceptance-test outcome, regression count and human-review errors. A lower token total with broken behavior is not an improvement.
6. Report median and spread by task type. Keep sources/configuration reproducible, and never confuse tool payload counters with provider usage.

For matched runs, define `net_difference_pct = 100 * (total_tokens_A2A - total_tokens_native)/total_tokens_native`. Positive values mean more reported tokens; negative values mean fewer. A2A cannot calculate this without **both** runs.

Do not publish token-savings percentages, cache savings, or 0% false-positive completion until independently verified end-to-end.

## Behavioral-audit interpretation (18 November 2026)

The private Antigravity history showed repeated reads of the same path in a session, but these reads may be justified after edits. The value **does not measure wasted tokens** or establish net A2A savings. Checkpoint/acceptance changes from [PR #36](https://github.com/alifakbxr/a2a/pull/36) are intended to reduce repeated, ungrounded exploration and overclaims, but the effect requires actual matched A/B experiments, not documentation or microbenchmarks. The release blocker remains [#15](https://github.com/alifakbxr/a2a/issues/15).
