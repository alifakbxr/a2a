# A2A Build Status — v2.0.0

## Implemented and Verified

- Native Antigravity plugin manifest (`plugin.json`), stdio MCP (`mcp_config.json`), concise `rules/AGENTS.md`, `hooks.json` (`SessionStart`, `PreInvocation`, `PostToolUse`), and 6 slash-command skills.
- Core MCP operations: `a2a_context` (`inspect`, `query`, `freshness`, `tokens`, `skeleton`), `a2a_impact`, `a2a_verify`, `a2a_evidence` (with backward-compatible `verifykit_*` routing and `A2A_LEGACY_TOOL_ALIASES=1` listing flag) plus MCP resources (`a2a://status`, `a2a://tokens/session`, `a2a://workspace/summary`).
- Hardened workspace trust: protected-roots denylist, no upward ancestor authorization, project-marker gated historical auto-trust, `antigravity-cli/settings.json` support, `autoTrust` modes, and TTL caching.
- Always-on, on-demand, and compact mode toggles via CLI, skills, and IDE customization page.
- Measured token telemetry: `telemetry` SQLite counters, cache-aware `transcript.jsonl` parsing (`PLANNER_RESPONSE`/`USER_INPUT`, skipping subagent transcripts on fallback), and lexer-safe code skeletonizer.
- Incremental SQLite schema (`a2a.sqlite`) with `(mtimeMs, size)` fast-path sync, revert-safe revision tracking, typed graph nodes/edges, run history, evidence, and incidents.
- Multi-stack manifest discovery, comment-aware symbol/import extraction (including Go/Swift/Kotlin and TS `.js`->`.ts`), and batched impact traversal.
- Native-execution-only verification plans; JUnit XML (`<testsuites>`/`<testsuite>` aggregation), TAP, and `a2a-test-report-v1` JSON assessments.
- Local CLI (`scripts/a2a.mjs`) for `doctor`, `mode`, `toggle`, `compact`, `autotrust`, `allow`, `revoke`, `inspect`, `tokens`, `skeleton`, `context`, `impact`, `plan`, `assess`, `evidence`, and `refresh`.
- Official `agy plugin validate . --strict` and `node scripts/check-release.mjs` passed.
