# Compatibility and Capability Matrix

PILAH is language-agnostic in its **file, evidence, and MCP contracts**. Static symbol extraction is heuristic. It is not a compiler or complete LSP implementation for any language.

| Stack | Manifest recognition | File-level code relationships | Existing test runner candidates | Limitations |
| --- | --- | --- | --- | --- |
| Node/JS/TS/Vue | package.json, tsconfig.json / jsconfig.json | local imports, configured literal `paths` suffix wildcards and symbols | npm scripts | dynamic imports, runtime aliases and complex inherited configurations are not modeled |
| PHP | composer.json | simple symbols, relative includes, static class `use` via Composer PSR-4 | PHPUnit / Pest candidates | Laravel container bindings, facades and dynamic routing not resolved |
| Python | pyproject.toml / requirements | simple symbols and relative Python imports | pytest candidates | import packages and decorators incomplete |
| Go | go.mod | files, `func`, `type struct/interface` symbols | go test | Go package graph not parsed fully |
| Rust | Cargo.toml | files and basic symbols | cargo test | modules/macros not fully resolved |
| Java/Kotlin | pom.xml / Gradle | classes, interfaces, `fun` symbols | Maven / Gradle test | JVM resolution/annotations incomplete |
| Dart/Flutter | pubspec.yaml | files and basic symbols | Flutter/Dart test | widget trees not statically modeled |
| Swift | Package.swift | classes, `func`, `protocol` symbols | swift test | Xcode project and runtime not inspected |
| C#/NET | csproj/sln | files and basic symbols | project-specific native runner | C# type graph incomplete |
| Godot/GDScript | project.godot | script/symbol references | Godot headless startup probe | headless start is **not** unit testing |
| C/C++ | CMakeLists.txt | quoted include references | ctest candidate | compiler flags and headers incomplete |
| Multi-language monorepo | multiple manifests | cross-file local relationships | per-ecosystem candidate list | aliases and service contracts require external evidence |

**Run test commands only with native Antigravity permissions after inspecting the project scripts.** PILAH does not install missing test infrastructure or promise identical cross-stack verification depth.

## Antigravity surface support

- **IDE:** MCP tools & resources, `hooks.json` (`SessionStart`, targeted `PreToolUse` only for native-test report correlation, targeted `PostToolUse`; no recurring `PreInvocation`), skills, and `rules/AGENTS.md`; native browser testing remains under `/browser`.
- **App:** MCP/plugin contract; browser and orchestration remain native.
- **CLI:** MCP/plugin contract and headless operation remain native (`antigravity-cli/settings.json` `trustedWorkspaces` supported, filtered by protected roots).
- **SDK:** not used to proxy models or run third-party agents. A separately written SDK client could call this standard MCP server if supported.

Availability and model permissions depend on the actual Antigravity version and account; PILAH never assumes universal `/swarm` or `/teamwork` in IDE.

## Runtime and evidence compatibility (PILAH 1.1.0)

Node.js **>=22.13.0** is required for built-in `node:sqlite`. CI now runs the **full test suite in one Ubuntu/Node 24 job per PR**, and **three Node 24 jobs (Ubuntu, macOS, Windows) on each main push**. The complete **9-job Node 22/24/26.13.1 × three-OS** compatibility matrix remains available via manual `workflow_dispatch`; run it before a release or when changing Node/OS-specific code. This reduces routine CI cost without deleting any test, and does **not** claim unrun combinations passed. Node 26.11+ exposes `sqlite.Database` and retains deprecated `DatabaseSync`; PILAH prefers the current class and falls back to `DatabaseSync` on Node 22. Tests include local MCP JSON-RPC/stdio, WAL/rollback, old verifykit.sqlite `VACUUM INTO` migration, permission/security and CLI doctor. Green Node CI does not prove installed Antigravity IDE compatibility on every host. The actual tool contract includes typed acceptance with UI viewport/state/reference, opt-in `model_recovery`/`tool_recovery`, and opt-in native orchestration with `file_ownership="independent"` for parallel recommendations. See [current MCP contract](CONTRACTS.md).

**Do not claim universal slash-command availability, browser access, native teamwork entitlements or running application compatibility without testing the installed environment.** PILAH never adds language runtimes or test drivers. Real PHP/Laravel STOCKROOM external acceptance remains blocked, even though its frozen sources passed syntax and Vite build preflight.

### NVM and Antigravity desktop PATH

PILAH declares `"command": "node"` in `mcp_config.json` and invokes `node` from its hooks. It resolves **whichever Node binary is in the Antigravity process's PATH**, which may differ from the interactive shell. An NVM-only Node installation may not be present when Antigravity is started from a desktop launcher.

For Linux/NVM diagnosis, check both `command -v node` and `node scripts/pilah.mjs doctor` inside a source checkout. Doctor now reports `node`, `node_binary`, `sqlite_api` and `sqlite_version`. If Antigravity cannot start its MCP server, verify the **IDE's inherited environment** and launch the IDE from a shell that has initialized NVM, or configure its process environment via the platform's supported mechanism. Do not hardcode one user's NVM path in the public plugin manifest.

The CI test does not have access to the user's Pop!_OS GUI session; a live Antigravity plugin validation and MCP smoke remain required by release gate #15.

### Non-login PATH advisory

`pilah doctor` reports `node_version_manager_path` and `path_advisory` when `process.execPath` is under common user-scoped NVM, fnm, Volta, asdf or nodenv layouts. This is a read-only warning: an interactive terminal's PATH does **not** prove a desktop-launched Antigravity process can spawn the same binary, and no shell probe, installation or config mutation is performed. Node 22.13+ remains required.

### Cross-platform HOME and path boundaries

`getHomeDir()` is the shared resolver for user-scoped Antigravity brain, token history, release config, snapshots, and CLI/hook paths, supporting Windows `USERPROFILE` when `HOME` is unset. Storage protects both the OS account home and an overridden `HOME` from permission changes. Relative project snapshots resolve against the authorized workspace root rather than the MCP process CWD. `isSamePath` and `isSameOrDescendantPath` consistently handle Windows/macOS case defaults and macOS `/private/var`, `/private/tmp`, `/private/etc` aliases. The benchmark capture reader canonicalizes the manifest root. These guards do not replace real native IDE/browser tests on each OS.

### Skill inclusion versus plugin MCP availability

An enabled plugin and four green MCP tools do not imply the PILAH skill metadata is in the **current** agent context. Antigravity may exclude skills through a global `~/.gemini/config/skills.json`, workspace `.agents/skills.json`, or subagent context filtering. Run `node scripts/pilah.mjs doctor` to inspect the **global manifest only** (`skill_discovery`), then check `/skills` in the actual IDE/CLI session and `agy plugin validate --strict`. `/skills reload` refreshes CLI discovery without invoking an PILAH MCP tool. Do not automatically remove exclusions or duplicate the skill in a second location. An `Excluded` indicator is not by itself proof of an MCP server outage or evidence that the model would choose PILAH when included.

### Native reporter provenance (PreToolUse + PostToolUse)

PILAH captures a bounded, private pre-run fingerprint only when a direct native test command declares a known report file. PostToolUse binds the reporter to the same conversation and tool step and requires it to be created or changed during that run; unchanged reports, missing preflight context and ambiguous executions remain unverified. This never auto-approves a command, reads model thinking, or treats a local named PASS as independent acceptance. The single-use fingerprint contains only hashed command identity and reporter hashes, not raw test logs or terminal arguments.

### Eager core context vs lazy advanced MCP tools (issue #71)

Antigravity defaults MCP tool definitions to **lazy**: a model must locate cached server schema files and call `call_mcp_tool`, even when a hook mentions the tool by name. The 21 Nov 2026 forensic archive contains 13 full transcripts, 227 planner responses and 611 native calls but **zero PILAH/MCP calls** with an injected PILAH Always-On policy in all 13; this proves no *observed invocation*, not that the tool was available to each model or that using it would have improved quality. Our original Always-On policy used direct `pilah_context(...)` syntax without explaining lazy tool discovery, a confirmed configuration/instruction mismatch.

To make **one** high-value entrypoint directly discoverable, `mcp_config.json` now marks `pilah_context` **eager**; `pilah_impact`, `pilah_verify` and `pilah_evidence` stay lazy to avoid registering four schemas every turn. Eager increases the fixed per-turn schema/context footprint even when unused. Native-first and zero **actual calls** for simple tasks remain mandatory; eager must not be used to game intervention counts. Plugin settings may still disable MCP, and subagent MCP inheritance is controlled by Antigravity. To verify: upgrade installed plugin, restart parent/subagent sessions, inspect `/mcp` and `/skills` and run an eligible read-only audit without mentioning PILAH. A full actual model-selection A/B must still be conducted independently; no performance gains are claimed from this static change.

Official reference: https://antigravity.google/docs/mcp (Tool loading: lazy vs eager).

### Context-health (opt-in initial phase, issue #91)

The `context-health --conversation ID [--milestone-complete]` command reuses PILAH's bounded local history parser once when explicitly requested. It uses planner step counts from conversation start only (not active token occupancy or steps since the last compact), never executes a compact command, never reads other sessions when an explicit valid ID is given and never installs a PreInvocation hook. An automatically running Context Guardian requires performance and host integration evidence before it can be enabled. The `--milestone-complete` state is user-reported, not independently verified by PILAH.

### Opt-in native Context Guardian (issue #91)

The standalone `node scripts/context-guardian.mjs status|enable|disable` CLI installs **only the PILAH-owned** `pilah-context-guardian` `PreInvocation` hook into the user's global `~/.gemini/config/hooks.json` after an explicit `enable` command. It preserves other user hooks, refuses conflicting or malformed configurations and cleanly removes its own hook on `disable`. No new global MCP server or third-party dependency is installed.

Default: disabled **with no per-turn child process**. While enabled, it reads **only Antigravity-provided** `initialNumSteps` and `invocationNum` metadata. Yellow review starts at 80 planner steps with reminders only every 35 invocations; red handoff review starts at 140 steps with 25-invocation cadence. These are UX heuristics, **not current active-context tokens or billing/quota metrics**. Uses an ephemeral message and makes **no** automatic compact/clear request. It cannot reliably detect unfinished tasks, so all advice says to finish the atomic edit/test before a handoff. No transcript text is read, state retained, or external request made.

Changing hook configuration may require restarting the Antigravity session. Antigravity's own tool and permission rules remain authoritative. If another process changes the hooks manifest concurrently or the PILAH-owned slot is occupied, the installer refuses to clobber it. This is a validated **implementation**, not proven token savings; installed-IDE latency/utility and parent/subagent behavior still require live acceptance. See [Google Antigravity hooks](https://antigravity.google/docs/hooks).


### Opt-in Context Guardian runtime path

An explicit `node scripts/context-guardian.mjs enable` records the current absolute Node executable (`process.execPath`) in its own `PreInvocation` command, avoiding reliance on an Antigravity desktop process inheriting an NVM shell PATH. The default-disabled Guardian creates no recurring hooks. Re-enable after changing Node versions, then restart the IDE; neither this change nor CI proves actual native-host execution. Existing user hooks are preserved and a malformed/non-object hooks manifest is never overwritten.

### Antigravity IDE 2.8.0 compatibility boundary (source audit)

IDE 2.8.0 changed backend activation, remote sign-in and multi-window recovery. The official plugin interface exposes `agy plugin list --json` with explicit plugin `enabled` state, version and component arrays. The PILAH `host-check` now uses that inventory, with a conservative parser for documented plain-text output on older CLI installations. A disabled plugin, invalid listing, missing MCP component, or unknown CLI state cannot report successful preflight. This check is deliberately **CLI-only**; the IDE-specific plugin and hook state still require an operator-run live validation.

Current PILAH MCP transport is local stdio. Its tools/resources subset negotiates legacy protocol versions `2024-10-07` (historical draft), `2024-11-05`, `2025-03-26`, `2025-06-18`, and `2025-11-25`; unsupported versions (including the newer `2026-07-28` discovery contract) are explicitly rejected. Source-level tests verify handshake and tool listing on separate sessions; these do not prove a particular Antigravity IDE build chooses a compatible protocol. The plugin keeps only one eager tool (`pilah_context`) as an explicitly measured adoption hypothesis, while the other three tools are lazy. Eager registration spends schema context on turns without PILAH usage; do not claim it saves tokens without a matched A/B experiment.

Separate host runbooks exercise IDE backend restart, parent/subagent tool discovery, permission denial, single-file zero-call control, cross-file invocation, remote workspace identity and two-window switching. CLI inventory alone cannot approve release readiness.

Official references: https://antigravity.google/docs/changelog?tab=ide ; https://antigravity.google/docs/plugins/ ; https://antigravity.google/docs/mcp/ ; https://antigravity.google/docs/hooks/
