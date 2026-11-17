# Threat Model and Safety Boundaries

## Trust boundaries

1. **Agent to MCP:** requests are untrusted inputs. JSON Schema-like validation checks known arguments, and the engine enforces additional limits.
2. **MCP to filesystem:** users must explicitly authorize a canonical workspace using the local CLI. All paths are restricted to the workspace, with traversal, symlink and sensitive-file exclusions. No arbitrary file-read response tool exists.
3. **MCP to storage:** only structured metadata is persisted in private user data. Workspace data is keyed by a SHA-256-derived canonical path identity. The DB is local, no network listener is created.
4. **External test artifacts:** machine-readable reports may be inaccurate or adversarial. Hashing detects later modification but is **not** an authenticity signature; confidence is scoped to supplied artifacts.
5. **Native Antigravity:** VerifyKit never increases Google permissions, bypasses sandbox prompts, accesses private endpoints, or impersonates the user's account.

## Denied behavior

- No automatic scripts, hooks or `npm install` in project folders.
- No general `exec`, shell commands, write-file, Git mutation, browser command or network request MCP tool.
- No automatic global workspace rules or transcript readers.
- No scanning symlink targets, `.env`, keys, credentials, `node_modules`, `vendor`, `.git`, build outputs or generated caches.
- No cross-workspace retrieval and no automatic reuse of history from a project with the same basename.

## Threat test suite

Unit/integration tests include path traversal, hidden secrets, symlink escapes, unknown tool arguments, denied workspace reads, incomplete reports, forged totals, missing named tests, stale source and changed artifacts. Repeat these on Windows with junctions/reparse points, on macOS with symlinks, and on Linux with mixed permissions before release.

## Residual risks

- MCP calls run with the local user's process permissions, not an OS-level sandbox applied by this plugin. The user explicitly authorizes each workspace; malware inside that workspace still represents a threat to *native test commands* they choose to execute.
- The workspace allowlist can be edited by processes running with the same user's OS permissions. It is an intentional user-consent boundary, not protection against a fully compromised local account.
- Static analyzers use conservative heuristics rather than full language compiler pipelines.
- The test report's content may be malicious or misleading; no cryptographic proof of process provenance is provided.
- The Node built-in SQLite API is experimental on some supported Node versions. Check compatibility and database backup/recovery behavior before production release.
- Large repositories are scanned on demand up to configured file/size caps; returned coverage may be incomplete.

## Privacy

Default telemetry/outbound network = **none**. No source code is uploaded. The allowlist file resides in user config; the SQLite database resides in `PLUGIN_DATA` or `VERIFYKIT_DATA_DIR`. Filesystem retention is under user control. Authorization and data deletion are separate operations; review the README before deleting the data directory.
