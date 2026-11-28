# Agent Skills discovery (v1.2.0 development)

PILAH's Skill catalog is a **local, read-only metadata inventory**. It is not a Skill loader, activation API, ranking engine, or proof that the current Antigravity agent has a Skill in context.

## Supported discovery roots

| Host surface | Workspace | Global | Additional |
| --- | --- | --- | --- |
| Antigravity App | `.agents/skills/<skill>/SKILL.md`, including bounded parent traversal | `~/.gemini/config/skills/<skill>/SKILL.md` | Plugin-managed Skills remain host-managed; PILAH does not inspect undocumented plugin storage |
| Antigravity CLI | Same workspace roots | `~/.gemini/config/skills/<skill>/SKILL.md` | `~/.gemini/antigravity-cli/skills`, `~/.gemini/skills`, and documented plugin CLI roots under `~/.gemini/config/plugins/*/skills` |
| Antigravity IDE | Same workspace roots | `~/.gemini/config/skills/<skill>/SKILL.md` | Legacy `~/.gemini/antigravity/skills` |

The catalog only reads the Skill folder's `SKILL.md` frontmatter and requires bounded scalar `name` and `description` fields. It does not read the full Skill body or scripts/resources. It ignores malformed metadata, symbolic-link roots/folders/files, and duplicate names. Discovery is capped at 200 Skills, 16 KiB per metadata file, two nested directory levels and eight workspace ancestors.

## Important boundaries

- The host remains authoritative for Skill discovery, availability, activation and execution.
- A listed Skill is **available on disk**, not necessarily loaded into the current conversation.
- Plugin-managed Skills on App/IDE remain host-managed because their on-disk storage path is not a stable public contract.
- `PreInvocation` can at most inject guidance where supported; it is not a documented Skill activation API. PILAH does not enable a `PreInvocation` hook in this milestone.
- No model calls, network requests, filesystem writes, shell execution or Skill-body reads occur during catalog discovery.
- The catalog returns metadata and source category only; it does not expose absolute paths or private Skill content.

## Validation status

The v1.2.0 branch adds automated filesystem tests for host-specific roots, workspace/global discovery, CLI-only and legacy IDE roots, malformed metadata, duplicate names and symlink rejection. These tests are source-level compatibility checks, not proof that a live Antigravity host activates a selected Skill. Installed-host validation remains a separate release gate.