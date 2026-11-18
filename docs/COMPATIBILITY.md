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

Node.js **>=22.13.0** is required for built-in `node:sqlite`. The following is tested in cross-platform **Node/MCP CI**, not confirmed for every installed Antigravity IDE version: Ubuntu Node 22/24, Windows Node 22, macOS Node 22. The actual tool contract includes typed acceptance with UI viewport/state/reference, opt-in `model_recovery`/`tool_recovery`, and opt-in native orchestration with `file_ownership="independent"` for parallel recommendations. See [current MCP contract](CONTRACTS.md).

**Do not claim universal slash-command availability, browser access, native teamwork entitlements or running application compatibility without testing the installed environment.** A2A never adds language runtimes or test drivers. Real PHP/Laravel STOCKROOM external acceptance remains blocked, even though its frozen sources passed syntax and Vite build preflight.
