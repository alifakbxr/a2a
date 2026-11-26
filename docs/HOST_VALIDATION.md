# PILAH — installed Antigravity acceptance runbook

This is a **manual, evidence-based** host acceptance plan. Repository CI and a CLI plugin listing cannot prove an agent loaded the skill, selected the right tool, or completed a coding task.

## Host preflight

From the exact checkout:

```sh
node scripts/pilah.mjs doctor --public
node scripts/host-check.mjs
agy plugin validate --strict .
agy plugin list --json
```

Unsupported or missing commands mean **not tested / blocked**, not PASS. The host checker executes only read-only native plugin validation and listing commands (no model runs, network probes or workspace writes). Redact any host logs before sharing. Actual host CLI syntax depends on the installed version; inspect `agy --help` when a command is unsupported.

## Live acceptance scenarios (operator-run)

| ID | Given / When / Then | Required proof |
| --- | --- | --- |
| H01 | A trivial single-file text edit → agent uses **zero** PILAH tools | Actual session trace and successful local diff |
| H02 | A source provider with two real consumers → agent chooses scoped `pilah_context` or `pilah_impact` | Trace, returned revision, correct changed/affected paths, no unrelated sibling |
| H03 | Revoked or protected project → PILAH tool call denied | Host tool error, no private path/content exposed |
| H04 | A high-risk edit → `pilah_verify` creates a typed plan, still `not_tested` before execution | Plan criteria and revision |
| H05 | A stale or missing native test report → handoff remains `stale`/`unknown`/`partial` | Original report, run provenance and non-PASS outcome |
| H06 | A real UI or stateful bug → native terminal/browser test runs, PILAH does not claim independent proof | Test report, actual interactions, source revision and unmet assertions |

**Frozen control variables:** same source SHA, Antigravity version, model, effort, permissions and tool availability for Native and PILAH. Evaluate at least five counterbalanced runs per configuration. Keep raw captures private and use `benchmarks/ab-evaluate.mjs` on explicitly supplied final CLI usage. Do not treat its results as independently accepted when `comparability.ready=false`.

## Completion rules

A host PASS requires real CLI/IDE test evidence for each scenario, not a generated summary. Record `completed`, `failed`, `partial`, `stale`, `unknown` or `not_tested`; never translate missing observations into PASS. The independent STOCKROOM F01–F18 suite and signed release authorization remain separate gates.

**Current status:** all H01–H06 are **not tested** in this repository-only audit. Do not publish or claim measured token savings.

## Antigravity IDE 2.8.0 extension cases (operator-run; not CI proof)

The latest IDE changelog documents faster backend startup, recovery-loop fixes,
Windows timeout changes, remote sign-in port forwarding and multi-window fixes.
These do **not** establish PILAH behavior without an installed-host trace.
Test against the exact PILAH SHA with the exact IDE build visible in Help/About.
Record each case as PASS/FAIL/BLOCKED/NOT_TESTED; store raw private logs outside
the repository.

| ID | When | Independently observed evidence |
| --- | --- | --- |
| I01 | Start the IDE with PILAH enabled, then restart the backend/editor | Confirm active plugin status, four MCP tool names, hook registration and correct stdio handshake after restart |
| I02 | Open two IDE windows with different authorized workspaces, then switch | Workspace-scoped tool responses remain isolated; no stale session or cross-project data |
| I03 | Switch between an explicitly revoked workspace and an authorized workspace | Tool requests to revoked workspace deny without disclosing paths or source |
| I04 | Connect to a remote workspace (SSH/remote host) | Verify the plugin executes where expected, Node 22.13+ is available, and local vs remote paths are never confused |
| I05 | Compare a simple edit against a cross-file risk scenario | Zero PILAH calls for trivial edit, bounded scope and relevant call when justified; collect model tool-choice traces |
| I06 | Use native Teamwork/subagents only after opt-in | Confirm tool inheritance and parent/subagent provenance; no invented team capability or independent acceptance |

**Native-first controls:** prefer Antigravity's own agent tools, permission policy,
Teamwork and model selection; PILAH supplies scoped source intelligence and
revision-bound verification only. Compare eager `pilah_context` vs lazy
registration using real measured usage rather than assuming an optimization.

**CLI vs IDE:** `agy plugin list --json` is a CLI inventory; it never proves
loaded IDE components. Inspect the IDE's Customizations dropdown and MCP
Servers panel and capture actual tool traces. IDE and CLI have different
transcript roots; do not merge their session identities automatically.

### Protocol and benchmark capture requirements

From a local test harness, verify MCP stdio initialization with `2024-11-05`, `2025-03-26`, `2025-06-18`, or `2025-11-25` (and historical draft `2024-10-07`), followed by an actual `tools/list` and authorized/denied `tools/call`. Unsupported `2026-07-28` discovery negotiation is not currently implemented; do not report a general host compatibility PASS if the installed host requires that protocol.

Use `node benchmarks/ab-evaluate.mjs <manifest.json>` on evaluator-controlled, genuine host captures. The report preserves absent provider usage as `null`, records five-run minimum and order counterbalance, and intentionally cannot elevate self-supplied acceptance to independent proof. Only the independent evaluator may sign matching F01–F18 receipts and release approval. For sharing, run `node scripts/export-benchmark.mjs <report.json>` and inspect the output before posting.

## Kanban benchmark: observed adoption gap (25 November 2026)

In an operator-supplied Antigravity IDE trace, the analyzed `/pilah` session
contained **128 planner responses**, **125 native tool calls**, **15 provider
capacity-error records** and **zero detected PILAH MCP invocations**. The
agent read `skills/pilah/SKILL.md`. This shows **skill consumption**, not a
successful MCP handshake or the availability of any tool in that host
session. Private archive content and any embedded credentials must not be
committed, attached to public issues, or copied into reports.

To discriminate *unavailable tool* from *available but not selected*:

1. Install the exact reviewed PILAH commit and inspect the **IDE** /mcp and
   /skills inventory, not only `agy plugin list --json` in CLI.
2. Locate the effective namespaced eager context declaration (typically
   `mcp_pilah_pilah_pilah_context`). The legacy schema name
   `pilah_context` is not necessarily a callable native function name.
   For lazy tools use the exact cached server path and
   `call_mcp_tool(ServerName,ToolName,Arguments)`.
3. Execute H02 on an authorized multi-file fixture with no explicit tool
   selection instruction. Record whether the agent chooses one relevant
   scoped call, an appropriate native alternative, or an unavailable tool.
4. Inspect sanitized tool-call metadata using
   `node scripts/compare-agent-traces.mjs native.jsonl pilah.jsonl`.
   It reports `pilah_mcp_calls` and `other_mcp_calls`; **zero calls does
   not establish availability or a defect**.
5. After actual eligibility and security cases, run counterbalanced,
   repeated Native/PILAH trials. Quota screenshots are not billable tokens;
   differences in weekly-limit percentage are descriptive only.

Do not alter prompt/permissions to force a passing intervention count.
Keep issue #127 open until real installed-host H01–H06 and matched outcomes
are independently recorded.

## Private full-transcript MCP forensic auditor (26 November 2026)

The privately supplied 243-session *metadata summary* reports 54,394 planner
responses, 56,713 native calls, 7,793 other MCP calls and **16 PILAH-named
invocations across five sessions**. These observations establish that PILAH
calls were attempted in some sessions, but **not** that they succeeded, were
available in all sessions, or were beneficial for a particular task.

After extracting the Antigravity archive locally (do not upload full private
logs to a public issue), run this **source-checkout-only** script:

~~~sh
node scripts/audit-mcp-adoption.mjs \
  "$HOME/Downloads/antigravity-logs" \
  --out "$HOME/Downloads/pilah_private_forensic_report.json"
~~~

The report contains only counts, operation names from an allowlist,
hashed session identifiers, and bounded non-PILAH screening candidates.
It does **not** include prompts, source paths, tool args/results, credentials,
model reasoning or local session identifiers. Inspect the JSON before sharing.
The output file is created with restrictive permissions and is never silently
overwritten.

**Evidence levels:** "attempted invocation" comes from an actual JSONL
\`PLANNER_RESPONSE.tool_calls\` entry. "Explicitly linked result" means
an exact tool-call ID matches a result event with an explicit success/error
state; a positive tool result is **not** proof the agent fulfilled the task.
When result IDs or statuses are absent, classify the outcome as **unmatched**,
not failure or success. This format is intentionally strict and can undercount
host-specific result shapes until independently validated. Native-first usage
does not require the agent to call PILAH on every eligible or simple task.

The report separately lists up to ten **screening candidates** with many
native tool calls but no observed PILAH calls. These are not automatically
complex or PILAH-eligible. Compare the five invoking sessions and suitable
non-invoking sessions using independently observed /mcp host inventory and
actual tasks before attributing low usage to a discovery or tool-selection
defect. The report **cannot** infer plugin version/availability by session,
official token usage, execution time, causal token savings, or acceptance
H01–H06.
