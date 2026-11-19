# Threat Model and Safety Boundaries

## Trust boundaries

1. **Agent to MCP:** requests are untrusted inputs. Schema validation checks known arguments, array item schemas, types, bounds, and unknown keys, and the engine enforces path and size limits.
2. **MCP to filesystem:** workspaces must be explicitly authorized via the CLI (`node scripts/a2a.mjs allow <path>`) or present in Antigravity's built-in user trust lists (IDE `state.vscdb` Workspace Trust `content.trust.model.key` and CLI `trustedWorkspaces`), configurable via `autoTrust` (`antigravity-trust` | `active-only` | `project-markers` | `off`). Explicit revocation overrides all automatic trust. `active-only` requires a workspace found in both the IDE/CLI trust sources and the latest bounded SessionStart hook record; untrusted process arguments are never accepted as authorization. `project-markers` is an opt-in historical-project discovery mode and must not be used as a substitute for independently reviewed authorization. Protected roots (`/`, `~`, `~/Documents`, `~/Downloads`, `~/Desktop`, `~/Music`, `~/Pictures`, `~/Videos`, `~/.config`, `~/.gemini`, `~/.ssh`, `~/.aws`, `~/.gnupg`, `tmpdir`) are always denied, and upward ancestor authorization is blocked.
3. **MCP to storage:** indexed code metadata, hashes, evidence, telemetry counters **and explicitly saved local Markdown artifact/checkpoint content** may be persisted in `PLUGIN_DATA` (`a2a.sqlite`). Do not store credentials in user-authored notes; a bounded assignment detector is defense in depth, not full secret detection. Workspace data is keyed by a SHA-256-derived canonical path identity. The DB is local; no outbound network listener is created.
4. **External test artifacts:** machine-readable reports may be inaccurate or adversarial. Hashing detects later modification but is **not** an authenticity signature; confidence is scoped to supplied artifacts.
5. **Native Antigravity:** A2A never increases Google permissions, bypasses sandbox prompts, accesses private endpoints, or impersonates the user's account.

## Denied behavior

- No automatic `npm install` or arbitrary script execution in project folders.
- No general `exec`, shell command, write-file, Git mutation, or browser-control MCP tool.
- Hooks (`hooks.json`) use `SessionStart` and targeted `PostToolUse` to record bounded metadata, native test-run observations and explicitly changed Antigravity brain Markdown snapshots where permitted. They do not run arbitrary project commands, modify repository source, or use `PreInvocation`.
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

Core MCP, hooks and local analysis make **no automatic outbound network requests**. The explicitly invoked `refresh` CLI command talks only to loopback `ANTIGRAVITY_LS_ADDRESS`; the separate optional `a2a stats` CLI command invokes an authenticated local `gh api` client to fetch GitHub repository traffic metrics over the network. Those repository clone/view counts **do not prove distinct installations**. No source code is uploaded. The allowlist and settings reside under `~/.config/a2a/`; the SQLite database (`a2a.sqlite`) resides in `PLUGIN_DATA` / `~/.gemini/antigravity/plugin_data/a2a` or `~/.config/a2a/data`. Transcript reading is local-only and read-only, skipping subagent transcripts on fallback.

## Publication security

Package publication is blocked by default unless independently pinned, signed external acceptance evidence and an Ed25519 approval signature bind the exact approved `main` commit, matching tag/package version, frozen F01–F18 registry and human approval variable. See [Release Authorization](./RELEASE_AUTHORIZATION.md). A signed report asserts provenance of a key, not independent truth of the test execution.

## Re-audit privacy and provenance controls (19 November 2026)

- **Edit-triggered Markdown history requires opt-in.** The default setting `artifact_auto_snapshot=false` prevents PostToolUse from copying full Antigravity brain Markdown into local SQLite/shadow files. Explicit `a2a artifact-autosnapshot on|off|status` controls future snapshots; it does not purge existing versions.
- **Explicit acceptance retention:** `persist_plan:true` stores user-authored Given/When/Then and UI references locally, under the authorized workspace with source revision and manifest hash. Avoid placing customer data, credentials or sensitive text in plans. It is off by default.
- **Native execution status:** an absent top-level error is *not* success. Local test provenance requires an unambiguous zero numeric exit code; failed/unknown events clear positive report hashes and cannot certify user-visible behavior.
- **Verification scope:** neither local machine test nor native hook metadata independently authenticates visual/browser/hardware/security acceptance. `verify_handoff` and `assess` use one local evidence-type policy.
- **Permission safety:** error classifier prioritizes authorization-denied signals even in mixed parameter/page ID messages. No retries or bypass occur automatically.

These are code-level mitigations. Do not claim independent native Antigravity payload compatibility, cryptographic local test provenance, complete secret detection or any guarantee against same-user filesystem interference.

## Behavioral reliability privacy and trust (PR #36)

The optional checkpoint API `save_checkpoint` rejects recognizable plaintext credential assignments and binds user-authored decisions/pending scenarios to a source revision. It **does not** prove that notes are factual. `model_recovery` warns when source changes; `tool_recovery` never persists or echoes its error hint and only returns bounded advice. An explicit user-approved environment must be maintained for parallel native workers; A2A does not confer new permissions. Only **synthetic, sanitized** behavioral regression fixtures were committed; real Antigravity private brain archives remain outside the public repository. See [5 Whys](BEHAVIORAL_5_WHYS_V2_0_1.md) and [contracts](CONTRACTS.md).

No authorization, hashing or input sanitizer is an OS-level security sandbox. Symlink and same-user races, test-run provenance and live environment privacy still require independent review before release.
