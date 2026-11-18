# Native orchestration advisor (#11)

Call `a2a_context` with `{"workspace":"/authorized/project","action":"orchestration","task":{"tier":"free","available_commands":["@subagent"],"workstreams":["api","tests"],"dependencies":"low","milestones":2}}`.

The recommendation is advisory only. A2A never launches workers, changes modes or requests permissions automatically. If the caller has not explicitly discovered available commands, the tool defaults to a single agent rather than guessing.

Official Antigravity docs describe subagents (available on all plans), Boost (paid), Swarm (Google AI Pro/Ultra) and Teamwork (paid) at https://antigravity.google/docs/teamwork/ . Paid tiers and features change; actual command availability must be supplied by the user/IDE, never inferred from the reasoning effort setting. Forum reports of Swarm MCP access variability: https://discuss.ai.google.dev/t/bug-fresh-swarm-workers-cannot-access-configured-mcp-servers-call-mcp-tool-missing-context-permission-denied/201194 — anecdotal and not an A2A-confirmed defect.

Benchmark native and A2A using equivalent orchestration modes, accounting for coordination overhead, tokens and quality gates.
