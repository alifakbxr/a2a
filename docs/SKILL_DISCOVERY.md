# Agent Skills discovery (v1.2.0 development)

PILAH's Skill catalog is a **local, read-only metadata inventory**. It is not a Skill loader, activation API, ranking engine, or proof that the current Antigravity agent has a Skill in context.

## Supported discovery roots

| Host surface | Workspace | Global | Additional |
| --- | --- | --- | --- |
| Antigravity App | `.agents/skills/<skill>/SKILL.md`, including bounded parent traversal | `~/.gemini/config/skills/<skill>/SKILL.md` | Plugin-managed Skills remain host-managed; PILAH does not inspect undocumented plugin storage |
| Antigravity CLI | Same workspace roots | `~/.gemini/config/skills/<skill>/SKILL.md` | `~/.gemini/antigravity-cli/skills`, `~/.gemini/skills`, and documented plugin CLI roots under `~/.gemini/config/plugins/*/skills` |
| Antigravity IDE | Same workspace roots | `~/.gemini/config/skills/<skill>/SKILL.md` | Legacy `~/.gemini/antigravity/skills` |

The catalog only reads the Skill folder's `SKILL.md` frontmatter and requires bounded scalar `name` and `description` fields. It does not read the full Skill body or scripts/resources. It ignores malformed metadata, symbolic-link roots/folders/files, and duplicate names. Discovery is capped at 200 Skills, 16 KiB per metadata file, two nested directory levels and eight workspace ancestors. Validated frontmatter is cached in-process by file identity and timestamps (maximum 400 entries); changed files invalidate their cache entry. Only metadata is cached, never the Skill body.

## Local relevance ranking

`rankSkills()` matches the task text against Skill names and descriptions using deterministic token overlap. Skill-name matches carry more weight; workspace Skills receive a small locality preference; optional caller-supplied usage counts are a bounded tie-breaker and cannot create a match by themselves. It returns at most two recommendations and suppresses weak/ambiguous matches. It makes no model call and does not read Skill bodies. Usage history is stored per workspace in the local SQLite database without task text or prompt content. The storage API requires an explicit `host_observed` activation evidence marker; discovery, ranking and recommendation never increment usage. Automatic usage learning remains disabled until a documented host event can reliably establish Skill activation.

## Important boundaries

- The host remains authoritative for Skill discovery, availability, activation and execution.
- A listed Skill is **available on disk**, not necessarily loaded into the current conversation.
- Plugin-managed Skills on App/IDE remain host-managed because their on-disk storage path is not a stable public contract.
- The `PreInvocation` hook runs only in the explicit `always-on` mode and injects a short hint only for high-confidence matches, only in an explicitly authorized workspace, and only when the recommendation fingerprint changes within that conversation. It is not a documented Skill activation API and cannot force the host to load a Skill.
- The hook defaults to the IDE path matrix. Set `PILAH_HOST_SURFACE=app|cli|ide` when a host installation needs a different documented path set; a validated `hostSurface` event field takes precedence.
- No model calls, network requests, filesystem writes, shell execution or Skill-body reads occur during catalog discovery or ranking.
- Usage counters are bounded, workspace-scoped and included in workspace privacy status/purge accounting.
- The catalog returns metadata and source category only; it does not expose absolute paths or private Skill content.

## Validation status

The v1.2.0 branch adds automated filesystem, ranking, cache, usage-storage and hook tests for host-specific roots, workspace/global discovery, CLI-only and legacy IDE roots, malformed metadata, duplicate names and symlink rejection. These tests are source-level compatibility checks, not proof that a live Antigravity host activates a selected Skill. Installed-host validation remains a separate release gate.