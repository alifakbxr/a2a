# Compatibility and Capability Matrix

A2A is language-agnostic in its **file, evidence, and MCP contracts**. Static symbol extraction is heuristic. It is not a compiler or complete LSP implementation for any language.

| Stack | Manifest recognition | File-level code relationships | Existing test runner candidates | Limitations |
| --- | --- | --- | --- | --- |
| Node/JS/TS/Vue | package.json | local import (`.ts`/`.mts`/`.cts` & `.js`->`.ts`) and symbols | npm scripts | path aliases and dynamic imports may be missed |
| PHP | composer.json | simple symbols, relative includes | PHPUnit / Pest candidates | framework route reflection not resolved |
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

**Run test commands only with native Antigravity permissions after inspecting the project scripts.** A2A does not install missing test infrastructure or promise identical cross-stack verification depth.

## Antigravity surface support

- **IDE:** MCP tools & resources, `hooks.json` (`SessionStart`, targeted `PostToolUse`; no `PreInvocation`), skills, and `rules/AGENTS.md`; native browser testing remains under `/browser`.
- **App:** MCP/plugin contract; browser and orchestration remain native.
- **CLI:** MCP/plugin contract and headless operation remain native (`antigravity-cli/settings.json` `trustedWorkspaces` supported, filtered by protected roots).
- **SDK:** not used to proxy models or run third-party agents. A separately written SDK client could call this standard MCP server if supported.

Availability and model permissions depend on the actual Antigravity version and account; A2A never assumes universal `/swarm` or `/teamwork` in IDE.

## Runtime and evidence compatibility (v2.0.1)

Node.js **>=22.13.0** is required for built-in `node:sqlite`. The expanded [Node runtime CI matrix](https://github.com/alifakbxr/a2a/pull/47) tests **Node 22, current Node 24, and exact Node 26.13.1** on **Ubuntu, macOS and Windows** (nine platform/runtime combinations). Node 26.11+ exposes `sqlite.Database` and retains deprecated `DatabaseSync`; A2A prefers the current class and falls back to `DatabaseSync` on Node 22. Tests include local MCP JSON-RPC/stdio, WAL/rollback, old verifykit.sqlite `VACUUM INTO` migration, permission/security and CLI doctor. Green Node CI does not prove installed Antigravity IDE compatibility on every host. The actual tool contract includes typed acceptance with UI viewport/state/reference, opt-in `model_recovery`/`tool_recovery`, and opt-in native orchestration with `file_ownership="independent"` for parallel recommendations. See [current MCP contract](CONTRACTS.md).

**Do not claim universal slash-command availability, browser access, native teamwork entitlements or running application compatibility without testing the installed environment.** A2A never adds language runtimes or test drivers. Real PHP/Laravel STOCKROOM external acceptance remains blocked, even though its frozen sources passed syntax and Vite build preflight.

### NVM and Antigravity desktop PATH

A2A declares `"command": "node"` in `mcp_config.json` and invokes `node` from its hooks. It resolves **whichever Node binary is in the Antigravity process's PATH**, which may differ from the interactive shell. An NVM-only Node installation may not be present when Antigravity is started from a desktop launcher.

For Linux/NVM diagnosis, check both `command -v node` and `node scripts/a2a.mjs doctor` inside a source checkout. Doctor now reports `node`, `node_binary`, `sqlite_api` and `sqlite_version`. If Antigravity cannot start its MCP server, verify the **IDE's inherited environment** and launch the IDE from a shell that has initialized NVM, or configure its process environment via the platform's supported mechanism. Do not hardcode one user's NVM path in the public plugin manifest.

The CI test does not have access to the user's Pop!_OS GUI session; a live Antigravity plugin validation and MCP smoke remain required by [release gate #15](https://github.com/alifakbxr/a2a/issues/15).

### Non-login PATH advisory

`a2a doctor` reports `node_version_manager_path` and `path_advisory` when `process.execPath` is under common user-scoped NVM, fnm, Volta, asdf or nodenv layouts. This is a read-only warning: an interactive terminal's PATH does **not** prove a desktop-launched Antigravity process can spawn the same binary, and no shell probe, installation or config mutation is performed. Node 22.13+ remains required.
