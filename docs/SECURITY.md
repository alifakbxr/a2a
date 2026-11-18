# Threat Model and Safety Boundaries

## Trust boundaries

1. **Agent to MCP:** requests are untrusted inputs. Schema validation checks known arguments, array item schemas, types, bounds, and unknown keys, and the engine enforces path and size limits.
2. **MCP to filesystem:** workspaces must be explicitly authorized via the CLI (`node scripts/a2a.mjs allow <path>`) or present in Antigravity's built-in user trust lists (IDE `state.vscdb` Workspace Trust `content.trust.model.key` and CLI `trustedWorkspaces`), configurable via `autoTrust` (`antigravity-trust` | `active-only` | `project-markers` | `off`). Explicit revocation overrides all automatic trust. `active-only` requires a workspace found in both the IDE/CLI trust sources and the latest bounded SessionStart hook record; untrusted process arguments are never accepted as authorization. `project-markers` is an opt-in historical-project discovery mode and must not be used as a substitute for independently reviewed authorization. Protected roots (`/`, `~`, `~/Documents`, `~/Downloads`, `~/Desktop`, `~/Music`, `~/Pictures`, `~/Videos`, `~/.config`, `~/.gemini`, `~/.ssh`, `~/.aws`, `~/.gnupg`, `tmpdir`) are always denied, and upward ancestor authorization is blocked.
3. **MCP to storage:** only structured metadata and telemetry counters are persisted in `PLUGIN_DATA` (`a2a.sqlite`). Workspace data is keyed by a SHA-256-derived canonical path identity. The DB is local; no outbound network listener is created.
4. **External test artifacts:** machine-readable reports may be inaccurate or adversarial. Hashing detects later modification but is **not** an authenticity signature; confidence is scoped to supplied artifacts.
5. **Native Antigravity:** A2A never increases Google permissions, bypasses sandbox prompts, accesses private endpoints, or impersonates the user's account.

## Denied behavior

- No automatic `npm install` or arbitrary script execution in project folders.
- No general `exec`, shell command, write-file, Git mutation, or browser-control MCP tool.
- Hooks (`hooks.json`) are strictly scoped to recording local session metadata (`active-session.json`) and test-run timestamps; they never mutate repository files or block execution.
- No scanning symlink targets, `.env`, keys, credentials, lockfiles, `node_modules`, `vendor`, `.git`, build outputs, or generated caches.
- No cross-workspace retrieval and no automatic reuse of history from a project with the same basename.

## Threat test suite

Unit/integration tests include path traversal, hidden secrets, lockfiles, symlink escapes, protected roots, upward authorization rejection, unknown tool arguments and nested array validation, denied workspace reads, incomplete reports, forged totals, missing named tests, stale source, and changed artifacts. Repeat these on Windows with junctions/reparse points, on macOS with symlinks, and on Linux with mixed permissions before release.

## Residual risks

- MCP calls run with the local user's process permissions, not an OS-level sandbox applied by this plugin.
- The workspace allowlist can be edited by processes running with the same user's OS permissions.
- Static analyzers use conservative heuristics rather than full language compiler pipelines.
- Test report content may be misleading; no cryptographic proof of process provenance is provided.
- Large repositories are scanned on demand up to configured file/size caps; returned coverage may be incomplete.

## Privacy

Default outbound network = **none** (`refresh` CLI command talks only to `localhost` `ANTIGRAVITY_LS_ADDRESS` when explicitly invoked by the user). No source code is uploaded. The allowlist and settings reside under `~/.config/a2a/`; the SQLite database (`a2a.sqlite`) resides in `PLUGIN_DATA` / `~/.gemini/antigravity/plugin_data/a2a` or `~/.config/a2a/data`. Transcript reading is local-only and read-only, skipping subagent transcripts on fallback.

## Publication security

Package publication is blocked by default unless independently pinned, signed external acceptance evidence and an Ed25519 approval signature bind the exact approved `main` commit, matching tag/package version, frozen F01–F18 registry and human approval variable. See [Release Authorization](./RELEASE_AUTHORIZATION.md). A signed report asserts provenance of a key, not independent truth of the test execution.
