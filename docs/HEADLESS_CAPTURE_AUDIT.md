# PILAH — private Antigravity headless capture audit

Use this after headless Native/PILAH runs. This **does not call a model, modify the workspace, grant permissions, or execute application tests**. It only reads locally saved CLI stream-json captures and matching .stderr files.

## Run

From a recent PILAH source checkout:

~~~sh
umask 077
node scripts/audit-headless-captures.mjs \
  "$HOME/Downloads/pilah-benchmark" \
  > "$HOME/Downloads/pilah-benchmark-headless-audit.json"
~~~

Only files named native-01.jsonl, pilah-01.jsonl, native-02.jsonl, pilah-02.jsonl, etc., and pilah-smoke.jsonl are inspected. Matching .stderr files in the same directory are consulted for permission/provider error classifications. Missing stderr is not treated as proof no error occurred. Do not upload raw JSONL or stderr: they may contain source, prompts or credentials. Inspect the metadata report before sharing.

The auditor is deliberately bounded (at most 100 captures, 32 MiB each, 1 MiB stderr); symlinked/nonregular/oversize inputs are refused. It prints only known run identifiers, token/duration counts, allowlisted tool names, known PILAH MCP operation names and error *categories*. It **never prints raw provider errors**, tool parameters, workspace paths, source content, final responses or prompts.

## What the statuses mean

- **INVALID:** a terminal result is missing or unsuccessful; the response is empty; a step has an ERROR state; a tool error/denied action is present; provider quota/capacity/rate-limit/permission hints occur; or usage is missing/inconsistent. Reported token counts on these runs are still observations, but do not measure successful task completion.
- **MECHANICALLY_COMPLETE:** the CLI reports SUCCESS, nonempty final response, valid official usage, and no *observed* denial/step failure. **This is not a task-quality PASS**. Unknown/invisible errors are possible.
- **eligible_for_quality_review:** two runs with the same numeric suffix meet mechanical completeness. They must still be assessed for identical repository snapshot, prompt, Antigravity version, model, effort, effective permission policy, tool availability, model quota, and application correctness.
- **descriptive_total_token_delta:** only populated when both paired runs are mechanically complete. Negative is less PILAH-reported usage, positive more, **not causal savings**.
- **confirmed_pilah_mcp_calls:** only counted when a completed call_mcp_tool carries known ToolName and matching ServerName; a cached response, reading a skill, or merely mentioning PILAH is not counted. Some CLI shapes may omit those fields, causing an undercount.

Do **not** add cache_read_tokens to total_tokens. No accumulated quota percentage is a model-token measurement.

## Real 27 November 2026 pilot: known outcomes before local raw audit

- Runs 01: placeholder model error, zero usage; invalid.
- Runs 02: both reported SUCCESS around 48k tokens, but tool command auto-denied; invalid.
- Native 03: SUCCESS with a nonempty final response, 118,792 reported tokens; no *observed* errors from shared summary. Needs quality review.
- PILAH 03: SUCCESS but 0 response characters, 1 denied MCP action, 1 ERROR step, 59,332 reported tokens; invalid.
- Native 04: terminal ERROR with Individual quota reached, 65,550 reported tokens, empty response; invalid.
- PILAH 04: not run; missing.
- PILAH smoke: SUCCESS, 1 observed PILAH impact MCP call, 58,742 reported tokens, nonempty response. Smoke does not count as an A/B pair.
- Fresh unprompted IDE B2 task showed 3 PILAH impact calls including two continuation cursor follow-ups; it is not a CLI A/B token run.

**No valid matched savings measurement exists in this pilot.** The operator's actual private files have not been independently imported into the repository audit; running this script locally is the next step to validate precise step/error counts without sending raw content.

For independent benchmark requirements, see [Host Validation](HOST_VALIDATION.md), [Token Efficiency](TOKEN_EFFICIENCY.md) and [Validation Backlog](MAIN_VALIDATION_BACKLOG.md).
