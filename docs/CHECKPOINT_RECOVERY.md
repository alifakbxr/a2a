# Interrupted verification checkpoints (issue #9)

Run `node scripts/checkpoint.mjs agy-stream.jsonl scenario-evidence.json` to create a **local, read-only** checklist from official Antigravity headless event streams and independently assigned scenario statuses. Pipe output to a private local file if persistence is needed. The script does not start, resume, or invoke a model.

`scenario-evidence.json` example:

```json
{"scenarios":[{"id":"online-checkout","status":"passed","evidence_ref":"ci/run-2"},{"id":"offline-restart","status":"not-tested"},{"id":"inventory-cross-tenant","status":"blocked","reason_code":"missing-harness"}]}
```

Statuses: passed, failed, blocked, partial, running, not-tested. Only externally verified achievements should be marked passed. Event status ERROR is **not equivalent** to a weekly quota limit; provider 503 and quota errors require separate provider evidence. A missing result means unknown/incomplete, not automatically exhausted.

The output includes a suggested `agy --conversation ID` command ONLY when the ID is validated; using it requires user approval and may be impossible if the conversation is unavailable. It never resumes automatically. Browser cookies, raw prompts, model text and verbose error bodies are discarded. The checkpoint does not prove source revision freshness.

Official sources: https://antigravity.google/docs/cli/headless/ and https://antigravity.google/docs/cli/commands/resume/ ; related user reports: https://github.com/google-antigravity/antigravity-cli/issues/163 .

**Pre-vNext trust note:** The checkpoint summarizes **reported** states, not independent test results. The output explicitly records `summary.reported_passed` and `summary.verified_passed:0` unless a separate verifier establishes actual evidence. Caller-supplied source and served-build revisions are not authenticated; a mismatch is flagged but matching strings are not proof of served build identity. No browser or model is resumed automatically.
