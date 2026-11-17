# Compatibility and Capability Matrix

VerifyKit is language-agnostic in its **file, evidence, and MCP contracts**. Static symbol extraction is heuristic. It is not a compiler or complete LSP implementation for any language.

| Stack | Manifest recognition | File-level code relationships | Existing test runner candidates | Limitations |
| --- | --- | --- | --- | --- |
| Node/JS/TS/Vue | package.json | local import and simple symbols | npm scripts | path aliases and dynamic imports may be missed |
| PHP | composer.json | simple symbols, relative includes | PHPUnit / Pest candidates | framework route reflection not resolved |
| Python | pyproject.toml / requirements | simple symbols and relative Python imports | pytest candidates | import packages and decorators incomplete |
| Go | go.mod | files and basic symbols | go test | Go package graph not parsed fully |
| Rust | Cargo.toml | files and basic symbols | cargo test | modules/macros not fully resolved |
| Java/Kotlin | pom.xml / Gradle | basic symbols | Maven / Gradle test | JVM resolution/annotations incomplete |
| Dart/Flutter | pubspec.yaml | files and basic symbols | Flutter/Dart test | widget trees not statically modeled |
| Swift | Package.swift | files and basic symbols | swift test | Xcode project and runtime not inspected |
| C#/NET | csproj/sln | files and basic symbols | project-specific native runner | C# type graph incomplete |
| Godot/GDScript | project.godot | script/symbol references | Godot headless startup probe | headless start is **not** unit testing |
| C/C++ | CMakeLists.txt | quoted include references | ctest candidate | compiler flags and headers incomplete |
| Multi-language monorepo | multiple manifests | cross-file local relationships | per-ecosystem candidate list | aliases and service contracts require external evidence |

**Run test commands only with native Antigravity permissions after inspecting the project scripts.** VerifyKit does not install missing test infrastructure or promise identical cross-stack verification depth.

## Antigravity surface support

- **IDE:** MCP and plugin contract; native browser testing remains under `/browser` and its local Chrome requirements.
- **App:** MCP/plugin contract; browser and orchestration remain native.
- **CLI:** MCP/plugin contract and headless operation remain native. CLI exit code alone does not constitute successful behavioral verification.
- **SDK:** not used to proxy models or run third-party agents. A separately written SDK client could call this standard MCP server if supported.

Availability and model permissions depend on the actual Antigravity version and account; VerifyKit never assumes universal `/swarm` or `/teamwork` in IDE.
