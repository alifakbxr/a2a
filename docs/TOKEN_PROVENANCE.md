# Token history: provenance and worker overlap (#5)

PILAH reports available Antigravity conversation usage including pre-install history. The report now includes `usage_accounting` for explicit source priority, excluded/included workers, missing records, attributable PILAH token *unknowns*, and unsupported weekly quota measurements.

**Do not sum parent and worker counters** when `--include-subagents` is requested: a parent result may already contain delegated usage. The optional view shows additional conversations for inspection, not a provider-confirmed combined bill. `detected plugin-call count` is a count of recognized tool calls, not an exact measure of model tokens caused by PILAH.

Official CLI `usage.total_tokens` already equals `input_tokens + output_tokens`; cache-read and thinking are separate diagnostics, not values added to official totals. Local transcript counters have undocumented semantics. No automatic collection, publication or background scanning is introduced.

Official source: https://antigravity.google/docs/cli/headless/ ; quota limitations: https://antigravity.google/docs/plans . See also `docs/CONVERSATION_USAGE.md`.

The future benchmark must validate worker inclusion and exact plugin overhead against independent provider instrumentation where available; a zero or invented savings percentage is not acceptable.

## Current developer status

The PR #36 behavioral work added recovery and evidence scopes but **did not** add a provider usage API or promise token savings. Local MCP/SQLite E2E is not a controlled Native/PILAH model-token benchmark. See open acceptance.
