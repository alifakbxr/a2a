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

From a local test harness, verify MCP stdio initialization with `2025-03-26`, `2025-06-18`, or `2025-11-25`, followed by an actual `tools/list` and authorized/denied `tools/call`. Unsupported `2026-07-28` discovery negotiation is not currently implemented; do not report a general host compatibility PASS if the installed host requires that protocol.

Use `node benchmarks/ab-evaluate.mjs <manifest.json>` on evaluator-controlled, genuine host captures. The report preserves absent provider usage as `null`, records five-run minimum and order counterbalance, and intentionally cannot elevate self-supplied acceptance to independent proof. Only the independent evaluator may sign matching F01–F18 receipts and release approval. For sharing, run `node scripts/export-benchmark.mjs <report.json>` and inspect the output before posting.
