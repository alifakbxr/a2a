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

## Low-token skill and MCP budgets — 19 November 2026

[Issue #44](https://github.com/alifakbxr/a2a/issues/44) addresses unnecessary instruction/context overhead on the `v2.0.1` development branch. The policy is **zero calls for trivial work; normally one targeted query OR bounded impact summary**; subsequent calls require new uncertainty or actual machine evidence. The skill no longer carries repeated CLI lists, chronological security incidents or release history.

| Static text surface | Before | Revised | Scope |
| --- | ---: | ---: | --- |
| `skills/a2a/SKILL.md` | 5,658 characters | 2,792 characters | **51%** less text if the complete skill is loaded |
| `rules/AGENTS.md` | 382 | 241 characters | Tiny permanent instruction |
| Always-On `SessionStart` message | 622 | 324 characters | Injected only when opt-in; zero on default On-Demand |

**Combined static character footprint:** 6,662 → 3,357 (**49.6% lower**), equivalent to roughly 1,753 → 883 local **chars/3.8 estimates**, *not* live Gemini billed tokens or cumulative session usage. Actual injection behavior depends on the installed IDE and which prompt surfaces are loaded. Do not add these numbers to provider usage or call them net savings.

**MCP output limits in default Compact (new installations):**

- `a2a_context(action="skeleton")`: 4,800 total skeleton characters; max 1,600 per file; up to six file previews, remaining entries marked `skipped: true`. Keep source revision, omitted/truncated counts and `estimated_preview_only`.
- `a2a_context(action="query",limit=5)`: prefer an exact symbol. In Compact, at most twelve relation rows. If clipped, `relations_truncated:true` and `relations_before_compaction` describe **the retrieved query response**, not the entire graph.
- `a2a_impact(summary=true)`: bounded eight affected paths and five related tests with risk, coverage and uncertainty preserved. This pre-existing summary remains the preferred impact call.
- Full outputs remain available via **explicit** `node scripts/a2a.mjs compact off`; existing explicit settings are preserved. Do not infer correctness from truncated previews.

**Quality gates:** automated tests enforce character budgets, default On-Demand injection neutrality, default Compact behavior, skeleton omission disclosure, relation trimming and non-fabricated token estimates. These tests measure **local output sizes only**. To prove usage benefit, run matched Native vs A2A model/effort/tasks with official provider usage and independent acceptance; F01–F18 and real installed Antigravity validation remain in [issue #15](https://github.com/alifakbxr/a2a/issues/15).
