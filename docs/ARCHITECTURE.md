# PILAH — architecture

PILAH is a **local-first, native-first engineering support layer** for Google Antigravity. Antigravity remains responsible for reasoning, file edits, terminal/browser actions, host permissions and optional native agents. PILAH provides scoped code intelligence, candidate impact, structured verification planning, and evidence/recovery diagnostics. It is **not** an agent runtime, language server, arbitrary shell executor or a guarantee of model cost savings.

## Runtime surface

- **Plugin:** `plugin.json`, `mcp_config.json`, `hooks.json`, `rules/AGENTS.md`, `skills/pilah/SKILL.md`.
- **Four public MCP tools:** `pilah_context`, `pilah_impact`, `pilah_verify`, `pilah_evidence`. They use JSON-RPC 2.0 over stdio and require an authorized absolute workspace. `pilah_context` is the only eager tool; others are lazy.
- **Compatibility:** callable `a2a_*` and `verifykit_*` tool aliases, `scripts/a2a.mjs`, `A2A_*` environment variables, and preexisting local storage paths remain supported; the default tool listing exposes only PILAH.
- **Runtime:** Node.js >=22.13.0 with built-in SQLite, no third-party npm runtime dependency, no automatic network service and no arbitrary project-command MCP tool.

## Components

| Component | Function | Known boundary |
| --- | --- | --- |
| [Security](../src/security.mjs) | Workspace trust/revocation, protected paths, settings and bounded file reads | No authorization from untrusted tool arguments |
| [Scanner](../src/scanner.mjs) and [graph](../src/graph.mjs) | Static symbol/import index and reverse-impact candidates | Not a compiler, full LSP or complete cross-language dependency graph |
| [Engine](../src/engine.mjs) and [MCP server](../src/mcp.mjs) | Four bounded public operations, JSON-RPC errors, read-first calls | Cannot edit code or control Antigravity |
| [Storage](../src/storage.mjs) | Local SQLite index, revision metadata, opt-in checkpoints and incident evidence | Explicitly saved notes may include private user-supplied content |
| [Verification](../src/verification.mjs) | Given/When/Then scope, machine-report assessment | Local tests do not independently certify visual, security, hardware or production outcomes |
| [Token diagnostics](../src/tokens.mjs) | Local provenance, size estimates and eligible session usage | Does not prove model token savings or billing |
| [RCA](../src/rca.mjs) | Bounded hypothesis and falsification notes | Local evidence is not independent causal proof |
| [Router](../src/workflow-router.mjs) | Deterministic native-only versus scoped PILAH advice | Does not switch models or auto-call tools |

## Engineering flow

1. **Native first.** If the task is clear, use zero PILAH calls. Prefer existing project code or platform primitives before adding code.
2. **Bound uncertainty.** When cross-file ownership/risk is unclear, request only one specific `pilah_context` or `pilah_impact` result; do not automatically chain.
3. **Reproduce and implement.** Antigravity executes approved project commands and changes source. Use a minimal complete patch, preserving validation, permissions, accessibility and public contracts.
4. **Verify at the right level.** Define typed plans for risk, run existing native test tools, attach exact named evidence where available. Changed source revisions invalidate stale evidence. Browser/security/hardware/independent claims need independent execution.
5. **Handoff.** State changed scope, observed results, failures, `not tested` cases and provenance. Never derive savings from response sizes or call counts.

## Trust, privacy and release

Project root authorization is mandatory; protected paths, credential files, unsafe symlinks, unauthorized descendants and source/evidence staleness are denied or flagged. Automatic full Markdown snapshots and user-global Context Guardian are disabled by default; opt-in features may retain local state or add invocation overhead. No agent or plugin may manufacture passing independent acceptance evidence.

The [current status](../BUILD_STATUS.md), [security model](SECURITY.md), [MCP contracts](CONTRACTS.md) and [validation backlog](MAIN_VALIDATION_BACKLOG.md) determine operational claims. **Repository CI is not an installed Antigravity E2E or authorized package release.**
