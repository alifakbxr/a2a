# PILAH — architecture

PILAH is a **local-first, native-first engineering support layer** for Google Antigravity. Antigravity remains responsible for reasoning, file edits, terminal/browser actions, host permissions and optional native agents. PILAH provides scoped code intelligence, candidate impact, structured verification planning, and evidence/recovery diagnostics. It is **not** an agent runtime, language server, arbitrary shell executor or a guarantee of model cost savings.

## Runtime surface

- **Plugin:** `plugin.json`, `mcp_config.json`, `hooks.json`, `rules/AGENTS.md`, `skills/pilah/SKILL.md`.
- **Four public MCP tools:** `pilah_context`, `pilah_impact`, `pilah_verify`, `pilah_evidence`. They use JSON-RPC 2.0 over stdio and require an authorized absolute workspace. `pilah_context` is the only eager tool; others are lazy.
- **Compatibility:** public calls use `pilah_*`, and the preferred source CLI is `scripts/pilah.mjs`. Earlier internal tool aliases, configuration keys and database paths remain recognized without exposing retired names in public guides. Inspect source before changing persisted identifiers.
- **Runtime:** Node.js >=22.13.0 with built-in SQLite, no third-party npm runtime dependency, no automatic network service and no arbitrary project-command MCP tool.

## Components

| Component | Function | Known boundary |
| --- | --- | --- |
| [Security](../src/security.mjs) | Workspace trust/revocation, protected paths, settings and bounded file reads | No authorization from untrusted tool arguments |
| [Scanner](../src/scanner.mjs) and [graph](../src/graph.mjs) | Static symbols, directional imports (including local Composer PSR-4 and configured JS/TS aliases), and heuristic test candidates | Not a compiler, full LSP or complete cross-language dependency graph |
| [Engine](../src/engine.mjs) and [MCP server](../src/mcp.mjs) | Four bounded public operations, JSON-RPC errors, read-first calls | Cannot edit code or control Antigravity |
| [Storage](../src/storage.mjs) | Local SQLite index, revision metadata, opt-in checkpoints, incident evidence and consent-gated workspace purge | Explicitly saved notes may include private user-supplied content |
| [Verification](../src/verification.mjs) | Given/When/Then scope, machine-report assessment | Local tests do not independently certify visual, security, hardware or production outcomes |
| [Token diagnostics](../src/tokens.mjs) | Local provenance, size estimates and eligible session usage | Does not prove model token savings or billing |
| [RCA](../src/rca.mjs) | Bounded hypothesis and falsification notes | Local evidence is not independent causal proof |
| [Router](../src/workflow-router.mjs) | Deterministic native-only versus scoped PILAH advice | Does not switch models or auto-call tools |

## Versioned graph index

`src/scanner.mjs` includes an explicit `GRAPH_INDEX_VERSION` in each source snapshot fingerprint. This invalidates a previously persisted SQLite dependency graph when PILAH's static parsing semantics are upgraded, even if project files themselves are untouched. The engine rebuilds the graph using the authorized workspace's current files. This is distinct from user edits: the source-index revision may change after a plugin update, intentionally invalidating prior evidence freshness claims rather than reusing relationships from an older scanner.

Do not automatically increment this version for documentation changes. Bump it when symbol/import/relationship generation changes and preserve a regression test that loads an older index revision. Existing workspace grants, user notes and project source are not deleted.

## Engineering flow

1. **Native first.** If the task is clear, use zero PILAH calls. Prefer existing project code or platform primitives before adding code.
2. **Bound uncertainty.** When cross-file ownership/risk is unclear, request only one specific `pilah_context` or `pilah_impact` result; do not automatically chain.
3. **Reproduce and implement.** Antigravity executes approved project commands and changes source. Use a minimal complete patch, preserving validation, permissions, accessibility and public contracts.
4. **Verify at the right level.** Define typed plans for risk, run existing native test tools, attach exact named evidence where available. Changed source revisions invalidate stale evidence. Browser/security/hardware/independent claims need independent execution.
5. **Handoff.** State changed scope, observed results, failures, `not tested` cases and provenance. Never derive savings from response sizes or call counts.

## Trust, privacy and release

Project root authorization is mandatory; protected paths, credential files, unsafe symlinks, unauthorized descendants and source/evidence staleness are denied or flagged. Automatic full Markdown snapshots and user-global Context Guardian are disabled by default; opt-in features may retain local state or add invocation overhead. No agent or plugin may manufacture passing independent acceptance evidence.

The [current status](../BUILD_STATUS.md), [security model](SECURITY.md), [MCP contracts](CONTRACTS.md) and [validation backlog](MAIN_VALIDATION_BACKLOG.md) determine operational claims. **Repository CI is not an installed Antigravity E2E or authorized package release.**

## Index freshness and legacy telemetry

The persisted file hash cache is an I/O optimization, never proof that unchanged `mtime` and size imply unchanged content. Cache reuse now also requires a matching filesystem `ctime`; old databases with no `ctime_ms` are upgraded in place and must re-read the first eligible file. Normal source modification with restored `mtime` but changed `ctime` invalidates cached hashes and rebuilds the graph. Filesystem timestamps are still not cryptographic change detection: high-assurance verification runs rehash source with `verifyIntegrity:true`. Unreadable directories mark the source inventory incomplete, preventing false freshness claims. The new metadata column does not erase old graph rows, revisions, evidence or workspace permissions.

Historical SQLite `nodes`/`edges` `revision_id` values are insertion/update provenance, **not** per-row freshness certificates. Unchanged rows legitimately retain older revisions after a new graph snapshot. The active workspace revision and current source snapshot determine the index revision; never count rows whose provenance differs from the active revision as stale without checking index consistency. Old telemetry `tokens_saved` is retained for compatibility but ignored for model usage and net savings; only matched provider-reported token usage establishes savings.
