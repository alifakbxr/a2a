# Token history: provenance and worker overlap (#5)

A2A reports available Antigravity conversation usage including pre-install history. The report now includes `usage_accounting` for explicit source priority, excluded/included workers, missing records, attributable A2A token *unknowns*, and unsupported weekly quota measurements.

**Do not sum parent and worker counters** when `--include-subagents` is requested: a parent result may already contain delegated usage. The optional view shows additional conversations for inspection, not a provider-confirmed combined bill. `a2a_calls_detected` is a count of recognized tool calls, not an exact measure of model tokens caused by A2A.

Official CLI `usage.total_tokens` already equals `input_tokens + output_tokens`; cache-read and thinking are separate diagnostics, not values added to official totals. Local transcript counters have undocumented semantics. No automatic collection, publication or background scanning is introduced.

Official source: https://antigravity.google/docs/cli/headless/ ; quota limitations: https://antigravity.google/docs/plans . See also `docs/CONVERSATION_USAGE.md`.

The future benchmark must validate worker inclusion and exact plugin overhead against independent provider instrumentation where available; a zero or invented savings percentage is not acceptable.
