# PILAH engineering method — research and adaptation

PILAH means **Project Intelligence, Logic, Analysis & Handoffs**. Its mission is to reduce unnecessary code and context while preserving correctness. It is an original, small implementation of general engineering principles, not an installation or fork of another agent plugin.

## Research-based choices

| Source | Reusable principle | PILAH behavior | Avoid |
| --- | --- | --- | --- |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Decide whether to write any code; reuse existing, native or installed primitives first; guard risky work | Minimum complete diff and targeted regression test | Copying its plugin, entire prompt or unverified benchmark savings |
| [Taylor Otwell — Tuple interview](https://podcast.tuple.app/episodes/taylor-otwell-creator-of-laravel/transcript) | Minimal code **that solves the task well**, opinionated/conventional APIs and maintainable backward compatibility | Prefer project conventions; no speculative abstraction; preserve security | Counting lines as the only metric |
| [Claude Code code-simplifier](https://claude.com/plugins/code-simplifier) | Review only changed code for simplification without behavior changes | Scoped, post-test cleanup | Mandatory extra agent for each trivial edit |
| [Superpowers](https://github.com/obra/superpowers) | Reproduce/root-cause/test first; RED-GREEN-REFACTOR and reviewed handoffs for hard changes | Adaptive evidence-based RCA and meaningful regression checks | Ritualistic workflows or forced TDD for copy changes |
| [Claude Code feature architecture](https://claude.com/resources/articles/steering-claude-code-skills-hooks-rules-subagents-and-more) | Rules always-on, skills on demand, deterministic hooks only when justified, subagents for isolated work | Tiny rule, one on-demand skill, four tools, opt-in workers | Importing Claude-only agent/team commands into Antigravity |
| [Antigravity plugin docs](https://antigravity.google/docs/build-plugins) | Native first, skills loaded on demand, plugin hook/MCP specs, runtime support | Use actual Antigravity plugin manifest, `skills/pilah`, `mcp_config.json` and permission policy | Assuming Claude's hook schemas are interchangeable |

## Claude Code versus Google Antigravity (Nov 2026)

| Dimension | Claude Code | Antigravity | PILAH decision |
| --- | --- | --- | --- |
| Main workflow | Terminal/IDE coding agent; strong git/CLI workflow | IDE/App/CLI with native agent, subagents, browser and plugin ecosystem | Keep Antigravity as executor |
| Persistent guidance | `CLAUDE.md`, rules, on-demand skills | Rules `AGENTS.md`, on-demand skills, native plugin bundles | Keep always-on guidance under one short paragraph |
| MCP and hooks | Broad tool/hook/plugin integration | MCP, plugin hooks, rules and agents with different schemas | Use native Antigravity contracts; no Claude emulation |
| Parallel agents | Subagents and agent teams available with host controls | Native subagents and workflow/orchestration host features | Opt-in, only independent tasks, no extra orchestrator |
| Verification | Native terminal, tests, web/browser integrations | Native terminal, browser and IDE acceptance | Treat local tests as local, not independent app proof |
| Context and cost | Usage varies by model/tool and workflows | Usage varies by model/tier and host context | Never claim PILAH token reductions without matched observed trials |

**What not to port:** Claude plugin installation syntax, Claude-only `CLAUDE.md` discovery assumptions, autonomous review subagents on every edit, model-based hooks running on every invocation, or another 10–20 skills. Adding them would increase maintenance and risk rather than simplify PILAH.

## Smallest complete change — decision procedure

1. Inspect goal, existing implementation, callers and authorized workspace.
2. Choose **delete/skip → reuse → platform primitive → installed code → minimum new code**.
3. Preserve external contracts, test coverage and boundary checks.
4. For significant risk, reproduce failure and run the smallest discriminating test before fixing. Re-test the exact affected behavior.
5. If still uncertain, make one precise PILAH MCP call. Do not automatically chain tools.
6. Finish with a concise proof ledger: changed, verified, not verified, known limits.

## Further 2026 harness research: what PILAH adopts

The following sources inform **design decisions**; none proves a percent improvement for PILAH or authorizes automatic modifications.

| Evidence | Finding and scope | PILAH decision |
| --- | --- | --- |
| [Anthropic Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) | On-demand filesystem-backed skills use progressive disclosure | Keep one short skill with links to references, no mandatory library of agent personas |
| [Empirical harness study](https://arxiv.org/abs/2609.20804), [minimal harness comparison](https://arxiv.org/abs/2609.40303) | Bash-capable models can be effective with minimal action surfaces; task/model changes may reverse the result | Permit native short scripts, do not remove the scoped four MCP operations without matched A/B tests |
| [MCP specification changelog, July 2026](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx) | OAuth applies to relevant HTTP servers; sampling and observability semantics have changed across protocol revisions | Keep local stdio MCP and workspace trust. No remote OAuth gateway, remote sampling, OTel exporter or daemon until an actual requirement exists |
| [GEPA optimize_anything](https://arxiv.org/abs/2605.19633) | A benchmark-specific ARC-AGI setup reports Gemini Flash rising from 32.5% to 89.5% through optimized architecture | Use offline human-reviewed instruction ablation with frozen regression tasks, never autonomous production prompt rewrites |
| [LinkedIn knowledge-graph RAG research](https://arxiv.org/abs/2404.17723) | One deployed support-workflow study reports a 28.6% median ticket resolution-time reduction | Reuse PILAH's local static graph; do not introduce a vector DB, PageRank service or persistent user-profile scoring by default |
| [Revolut self-hosting case report](https://www.theregister.com/ai-and-ml/2026/11/03/british-fintech-revolut-slashes-ai-coding-costs-10x-by-cutting-out-claude-and-going-self-hosted/) | Revolut reports ~90% lower inference expense from a **large self-hosted model/GPU setup**, not a validated plugin optimization | Do not copy infrastructure economics to a local Antigravity plugin |
| [Antigravity overview](https://antigravity.google/docs/overview) | Host has its own subagents, schedules, tools and verification | Rely on host-native opt-in capabilities; do not create sidecars or a second orchestration runtime |

**Unverified or non-portable:** a universal 2× Bash/MCP ratio, a generic 1M→60k-token code-mode effect, >90% cache hit rate in PILAH, 3× GraphRAG accuracy across codebases, and Humanity's Last Exam gains from reflective memory. These are specific studies, demonstrations, or not independently reproduced here. They are **not acceptance criteria or marketing claims**.

### Lean evaluation loop

1. Fix a representative source snapshot, evaluation rubric, security negatives and success definition.
2. Compare native Antigravity and PILAH at matched model, effort, permissions and hardware; counterbalance run order.
3. Measure official model tokens where available, wall time, tool failures, successful task completion and **cost per independently accepted task**. Missing provider usage stays `unknown`.
4. Make a single versioned change to the skill or tool surface; rerun the same suite plus unseen holdout tasks.
5. Reject regression, misleading green tests, invented provenance and lower-cost failures. Require review before merging. **No automatic self-improvement daemon.**

See [CI and evaluation](CI_EFFICIENCY.md), [A/B methodology](AB_EVALUATION.md) and [unverified live acceptance](MAIN_VALIDATION_BACKLOG.md).

## Brand/compatibility status

The new plugin identity, skill, four default MCP tools and package manifest are `pilah`. The existing `a2a_*` and `verifykit_*` tools are callable compatibility aliases; `A2A_*` settings and local data directories remain readable rather than silently moved. Existing installations need an explicit migration from the old Antigravity plugin name; do not keep both active unintentionally.

Repository **GitHub rename** and **npm publication** are separate ownership operations. Until those are actually performed, `github.com/alifakbxr/a2a` is the canonical source and `@aliip/pilah` is a source-package identifier, **not a claim that this package has been published**. External F01–F18/host benchmarks remain pending; see [main validation backlog](MAIN_VALIDATION_BACKLOG.md).
