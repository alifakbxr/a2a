# PILAH — installed Antigravity acceptance runbook

This is a **manual, evidence-based** host acceptance plan. Repository CI and a CLI plugin listing cannot prove an agent loaded the skill, selected the right tool, or completed a coding task.

## Host preflight

From the exact checkout:

```sh
node scripts/pilah.mjs doctor --public
node scripts/host-check.mjs
agy plugin validate --strict .
agy plugin list
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
