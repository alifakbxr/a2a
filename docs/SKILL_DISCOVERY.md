# Agent Skills discovery (v1.2.0)

PILAH maintains a bounded, read-only metadata inventory aligned with Antigravity's current customization discovery contract. It does not load Skill bodies, execute scripts, activate a Skill, or prove that a Skill is present in the current model context.

## Supported sources

- Workspace .agents/skills/<skill>/SKILL.md and aliases .agent/, _agents/, and _agent/.
- Workspace customization folders from the current directory up to the detected repository root. Without a repository marker, only the current workspace folder is scanned.
- Personal ~/.gemini/config/skills/ and ~/.gemini/config/skills.json manifest.
- Repository personal customization folders configured through .gemini/config.json and personal_customization_dir.
- IDE legacy ~/.gemini/antigravity/skills/.
- CLI-only ~/.gemini/antigravity-cli/skills/ and ~/.gemini/skills/, which take precedence over all other local sources and are not hidden by manifest exclusions.
- Installed plugins under ~/.gemini/config/plugins/<plugin> with a valid plugin.json (or .antigravity-plugin/plugin.json) and skills/<skill>/SKILL.md. Plugin Skill names are namespaced as <plugin>:<skill>.

Antigravity built-in Skills are host-managed and are not ordinary local Skill files; PILAH does not invent or mirror them. Plugin discovery is based on installed plugin manifests and directories. Whether a plugin is enabled and its Skill is loaded remains host-owned state, not something PILAH can independently assert.

## Discovery manifests

PILAH reads workspace skills.json files in .agents/ and the documented aliases between the workspace and repository root, plus ~/.gemini/config/skills.json. It supports bounded entries, inherits, include_only, and exclude fields. Inherited manifest paths must be absolute. Relative workspace entry paths resolve from the directory containing the customization folder, with repository-root fallback; personal paths resolve from ~/.gemini/config/. Repository personal-folder manifests resolve relative entries from the repository root. Manifest traversal is capped at four levels and 64 manifests. Wildcards are not interpreted. A manifest can explicitly select deeper Skill paths through include_only; otherwise standard folders are scanned one level deep. Unsafe paths, symlinks, malformed JSON, oversized manifests, and invalid filters are ignored.

## Metadata, cache, and limits

Only frontmatter name and description are parsed; the optional disable-model-invocation flag is honored so manual-only Skills are never automatically recommended. Folded and literal YAML description blocks are supported, and the Skill name must match its containing folder. Skill bodies, scripts and resources are never read. UTF-8 BOM, LF and Windows CRLF are supported. Duplicate required keys, invalid names, empty/oversized descriptions and unsafe scalar forms are rejected. Symlink Skill directories/files are rejected.

Discovery is capped at 200 Skills, 16 KiB per Skill metadata file, 64 KiB per manifest, 400 persistent cache entries and 256 KiB of cache storage. Validated metadata is cached across hook processes in private ~/.config/pilah/skill-metadata-cache.json; file identity and timestamps invalidate changed entries. No task text, Skill body, or absolute Skill file path is stored in the cache.

## Ranking, hooks, and learning

Ranking is deterministic and local. It normalizes English/Indonesian terms, uses a small explicit domain-synonym map, weights exact Skill-name matches more strongly, applies a coverage threshold and abstains on weak matches. Usage history is a small tie-breaker only. At most two recommendations are returned. No model or network call is made.

The dedicated PreInvocation hook runs before each model invocation, requires always-on, an authorized workspace and a high-confidence match, and injects only a short hint. Host surface is derived from the documented transcript path (App, CLI or IDE); an explicit test override is supported. PILAH never invokes MCP, activates Skills, changes permissions, or overrides native agent choice.

Usage learning observes successful, un-ranged PostToolUse/view_file events for a valid SKILL.md under a discovered Skill root. It records a workspace-scoped Skill name, source category, count and timestamp only. This is evidence of a completed full-file read, not proof that a Skill improved task quality. Learning is opt-in and stops when the workspace is not authorized.

## Evidence boundaries

The synthetic bilingual benchmark measures only deterministic lexical routing on its small fixture corpus. It does not measure production precision/recall, host Skill activation, task quality, or token savings. Those require live, controlled App/CLI/IDE tests with identical task, model, effort, permissions and available Skills.
