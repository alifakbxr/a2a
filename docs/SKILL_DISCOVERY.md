# Agent Skills discovery (v1.2.0 development)

PILAH's catalog is a bounded, read-only metadata inventory. It is not a Skill loader, activation API, or proof that a Skill is in the current agent context.

## Discovery and cache

The documented App/CLI/IDE path matrix is unchanged. Workspace discovery also recognizes Antigravity's backward-compatible `.agent/`, `_agents/` and `_agent/` customization directory aliases alongside `.agents/`. Discovery is capped at 200 Skills, 16 KiB per metadata file, two nested directory levels and eight workspace ancestors. Only frontmatter name and description are parsed; Skill bodies, scripts and resources are never read. UTF-8 BOM, LF and Windows CRLF are supported. Duplicate required keys, invalid names, empty/oversized descriptions and unsafe scalar forms are rejected. Symlink Skill directories/files are rejected.

Validated metadata is cached across hook processes in private `~/.config/pilah/skill-metadata-cache.json`. It stores file identity/timestamps plus name and description only, is capped at 400 entries and 256 KiB, and is written through a private temporary file before replacement. The cache is disposable and rebuilt if a platform-specific replacement is interrupted. Device, inode, size, mtime or ctime changes invalidate entries. Unsafe or unavailable cache state fails closed; discovery continues without cache. No task text or Skill body is stored.

## Local ranking and capability routing

Ranking is deterministic and local. It normalizes English/Indonesian terms, uses a small explicit domain-synonym map, weights exact Skill-name matches more strongly, applies a coverage threshold and abstains on weak matches. No model or network call is made. Usage history is a small tie-breaker only. At most two recommendations are returned. The shared capability router combines Skill recommendations with the existing caller-declared workflow router. It remains advisory: it never invokes MCP, activates Skills or changes host permissions. Native Antigravity capabilities remain authoritative.

The bilingual corpus is synthetic and does not establish production precision/recall, Skill activation, task quality or token savings.

## Hook behavior and limits

PreInvocation uses a dedicated `scripts/skill-hook.mjs` entrypoint rather than importing the full scanner, engine and verification hook. It remains opt-in through `always-on`, requires an authorized workspace and injects only a high-confidence hint. It does not force Skill activation. Antigravity still starts a hook process for each registered PreInvocation event; PILAH reduces the loaded module graph and repeated metadata parsing but does not claim zero process-start overhead.

Recommendation injection is capped at two distinct fingerprints per conversation, with duplicate fingerprints suppressed. State stores only fingerprints and counters, never task text.

Usage learning is opt-in through `always-on`. A dedicated `PostToolUse` hook observes successful, un-ranged `view_file` calls for `SKILL.md`; it accepts the event only when the path resolves to a valid Skill inside a documented workspace/global/CLI/IDE Skill root and the workspace is authorized. Tool errors, ranged reads, ordinary files, invalid metadata, unsafe paths, and revoked workspaces are ignored. Only the normalized Skill name, source category, count, and last-used timestamp are stored. No task text, Skill body, or local file path is retained. This is evidence that Antigravity completed a full-file read of the Skill manifest, not proof that the Skill improved the task outcome. The native host remains responsible for discovery, activation, and execution.
