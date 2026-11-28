# Agent Skills discovery (v1.2.0 development)

PILAH's catalog is a bounded, read-only metadata inventory. It is not a Skill loader, activation API, or proof that a Skill is in the current agent context.

## Discovery and cache

The documented App/CLI/IDE path matrix is unchanged. Discovery is capped at 200 Skills, 16 KiB per metadata file, two nested directory levels and eight workspace ancestors. Only frontmatter name and description are parsed; Skill bodies, scripts and resources are never read. UTF-8 BOM, LF and Windows CRLF are supported. Duplicate required keys, invalid names, empty/oversized descriptions and unsafe scalar forms are rejected. Symlink Skill directories/files are rejected.

Validated metadata is cached across hook processes in private `~/.config/pilah/skill-metadata-cache.json`. It stores file identity/timestamps plus name and description only, is capped at 400 entries and 256 KiB, and is written through a private temporary file before replacement. The cache is disposable and rebuilt if a platform-specific replacement is interrupted. Device, inode, size, mtime or ctime changes invalidate entries. Unsafe or unavailable cache state fails closed; discovery continues without cache. No task text or Skill body is stored.

## Local ranking and capability routing

Ranking is deterministic and local. It normalizes English/Indonesian terms, uses a small explicit domain-synonym map, weights exact Skill-name matches more strongly, applies a coverage threshold and abstains on weak matches. No model or network call is made. Usage history is a small tie-breaker only. At most two recommendations are returned. The shared capability router combines Skill recommendations with the existing caller-declared workflow router. It remains advisory: it never invokes MCP, activates Skills or changes host permissions. Native Antigravity capabilities remain authoritative.

The bilingual corpus is synthetic and does not establish production precision/recall, Skill activation, task quality or token savings.

## Hook behavior and limits

PreInvocation uses a dedicated `scripts/skill-hook.mjs` entrypoint rather than importing the full scanner, engine and verification hook. It remains opt-in through `always-on`, requires an authorized workspace and injects only a high-confidence hint. It does not force Skill activation. Antigravity still starts a hook process for each registered PreInvocation event; PILAH reduces the loaded module graph and repeated metadata parsing but does not claim zero process-start overhead.

Recommendation injection is capped at two distinct fingerprints per conversation, with duplicate fingerprints suppressed. State stores only fingerprints and counters, never task text.

Automatic usage learning remains disabled: PILAH has not established a documented, independently verifiable host event for actual Skill activation. A manually supplied `host_observed` marker is not independent proof.
