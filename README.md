# A2A — Agent to Alif

<p align="center"><img src="assets/logo.svg" alt="A2A logo" width="90"></p>

**Local-first engineering context, impact analysis, evidence-scoped verification, and transparent token diagnostics for Google Antigravity.**

[![CI](https://github.com/alifakbxr/a2a/actions/workflows/ci.yml/badge.svg?branch=v2.0.1)](https://github.com/alifakbxr/a2a/actions/workflows/ci.yml) · [npm package](https://www.npmjs.com/package/@aliip/a2a) · [MIT License](LICENSE)

> **Release status (18 November 2026):** The `v2.0.1` *development branch* contains the merged behavioral reliability work from [PR #36](https://github.com/alifakbxr/a2a/pull/36). Its local MCP/SQLite E2E and cross-platform Node CI passed (213 tests on Ubuntu Node 22; [post-merge run](https://github.com/alifakbxr/a2a/actions/runs/44325007116)). **It has not been promoted to `main`, published as a new 2.0.1 npm/GitHub release, or independently accepted in real Antigravity.** Existing registry versions, if any, can differ from this branch. See [release gate #15](https://github.com/alifakbxr/a2a/issues/15).

## What A2A does

A2A augments the *native Antigravity agent*; it is not a model, terminal proxy, browser engine, security sandbox, or automatic guarantee of bug-free software. The model still writes code, runs approved native tools, and decides when to use A2A. A2A provides:

- **Context:** source inventory, bounded graph/symbol queries, lexer-safe previews, conversation history and scoped token diagnostics.
- **Impact:** reverse-dependency heuristics, affected files and related test candidates, including uncertainty.
- **Verify:** risk-aware plans, structured Given/When/Then acceptance criteria, named JUnit/TAP/JSON assertion checks, browser/semantic evidence inspection, and independently signed release assessment.
- **Evidence:** source-revision-aware history, artifacts/incidents, opt-in decision checkpoints, model failure recovery, and bounded native tool recovery guidance.

**Four public MCP tools only:** `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence`. Legacy `verifykit_*` aliases remain callable; listing requires the explicit `A2A_LEGACY_TOOL_ALIASES=1` flag.

### Re-audit hardening (19 November 2026)

The follow-up [re-audit issues #38–#42](https://github.com/alifakbxr/a2a/pull/43) identified five coverage, privacy and recovery gaps. Handoff verification now applies the same evidence-type restrictions as local assessment: a named build cannot prove browser, visual, hardware, security or independent acceptance even with native-hook metadata. A native test hook records success only with an explicit unambiguous process exit code of zero; missing and failed status are **not success**. Permission-denied recovery takes priority over page IDs.

**Optional complete-scope acceptance:** use `a2a_verify(operation="plan",persist_plan=true)` to retain a private, revision-bound plan and receive a `plan_id`. Pass that ID to `a2a_verify(operation="assess")` to include all required scenarios, including omitted ones as `not_tested`. If code changed, the bound plan is stale. Explicitly reissue the **unchanged scope** on the new source revision with `a2a_verify(operation="plan",plan_id="<previous-id>",persist_plan=true,criteria=[])`; this resets all scenarios to `not_tested` and does not verify test results. If a criterion explicitly pins `source_revision`, A2A refuses to reissue it onto different code: review that criterion and create a new plan with the updated revision. Standalone legacy assessment remains available but its coverage is **scope-unbound**; none can claim independently verified completion.

**Brain Markdown privacy:** automatic full-content edit-event snapshotting is now **OFF by default**. Manually enable with `node scripts/a2a.mjs artifact-autosnapshot on`; check status or turn it off with `artifact-autosnapshot status|off`. When enabled, local SQLite and shadow files may retain sensitive Markdown content; disabling does **not** delete previously saved data. `snapshot_artifact` remains an explicit, separate operation.

### Truthful completion

A2A does **not** turn a successful build, a screenshot, an arbitrary test name or locally supplied JSON into proof of end-to-end behavior. A structured acceptance item declares a scenario, required evidence type and (for browser/visual cases) viewport, UI state and reference. Planning starts `not_tested`; local assessments report only the **named test assertions** actually present, with a `completion.fully_verified=false` summary. Browser, visual, hardware, security and independent acceptance cannot be established from a local build/test report. Real release approval is separate and fail-closed.

## Requirements and installation

- **Node.js >= 22.13.0** (built-in `node:sqlite`). The [extended CI matrix](https://github.com/alifakbxr/a2a/pull/47) validates Node 22/24 and **Node 26.13.1** on Ubuntu, macOS and Windows; Node 26 uses its current `sqlite.Database` API with an older-node fallback.
- Google Antigravity with plugin/MCP support for IDE integration.
- No third-party **runtime** npm dependencies and no automatic remote A2A telemetry service. The optional explicit `a2a stats` CLI command invokes an installed/authenticated `gh` client to read GitHub repository traffic; clone counts are **not verified plugin installations**.

**To evaluate the current unpublished `v2.0.1` branch from source:**

```bash
git clone https://github.com/alifakbxr/a2a.git
cd a2a
git checkout v2.0.1
node --version
npm test
node scripts/check-release.mjs
node scripts/a2a.mjs doctor
```

With the compatible Antigravity CLI available, you can additionally run `agy plugin validate --strict .` and inspect `agy plugin list`. These are **required live integration checks**, not tests this README claims to have executed on every user's machine. Configure/install this checkout as an Antigravity plugin using your installed Antigravity version's native plugin manager. The checked-in `plugin.json`, `mcp_config.json`, `hooks.json` and `skills/a2a/SKILL.md` define the integration.

The npm registry package can be used separately (`npm install -g @aliip/a2a`), but **do not assume its published version matches the `v2.0.1` source branch**. The CLI is available as `a2a` when installed globally, or `node scripts/a2a.mjs` from a checkout.

## Operating modes

- **On-Demand (default):** do not call A2A unless requested or genuinely needed by a native workflow.
- **Always-On (opt-in):** a bounded adaptive policy injected at `SessionStart`. Small tasks should still cause **zero** A2A calls.
- **Compact (default on for new installations):** bounded responses with explicit truncation/omission markers; run `node scripts/a2a.mjs compact off` to request fuller output. Existing explicit settings are honored. Neither mode changes evidence truth or release eligibility.
- **Workspace trust:** authorization is required; an explicit revocation takes precedence over auto-trust. No permission bypass.

```bash
node scripts/a2a.mjs help
node scripts/a2a.mjs mode on-demand
node scripts/a2a.mjs mode always-on
node scripts/a2a.mjs toggle
node scripts/a2a.mjs compact on
node scripts/a2a.mjs compact off  # optional: expand code/graph previews
node scripts/a2a.mjs autotrust active-only
node scripts/a2a.mjs allow /absolute/path/to/project
node scripts/a2a.mjs revoke /absolute/path/to/project
node scripts/a2a.mjs inspect /absolute/path/to/project
node scripts/a2a.mjs impact /absolute/path/to/project src/auth.js
node scripts/a2a.mjs tokens --limit 5 --json
node scripts/a2a.mjs doctor
```

> These are **verified CLI subcommand names**, not guaranteed Antigravity chat slash commands. The actual in-agent surface consists of the four MCP tools and plugin skill. Never infer that `/a2a-always-on`, `/a2a-toggle`, etc. are registered chat commands unless the installed Antigravity version exposes them.

## MCP examples

**Typed verification plan** (input to `a2a_verify`; replace workspace and scenario):

```json
{
  "workspace": "/absolute/path/to/project",
  "operation": "plan",
  "criteria": [
    {
      "id": "duplicate-checkin",
      "description": "Repeated scan must not reprint",
      "given": "The guest has already checked in",
      "when": "The same QR code is scanned again",
      "then": "No second print job is produced",
      "evidence_type": "hardware",
      "negative": true
    }
  ]
}
```

The returned acceptance plan is `not_tested`. For a local machine report, use `operation="assess"` with explicit `artifact` and exact `test_name` on each criterion. A local printer-related test result does **not** attest a real printer run. For visual/browser plans, supply `viewport`, `ui_state`, and `reference` too.

**Native recovery help** (input to `a2a_evidence`):

```json
{
  "workspace": "/absolute/path/to/project",
  "operation": "tool_recovery",
  "tool_family": "browser",
  "error_class": "context_lost",
  "retry_count": 2
}
```

Output is **guidance only**: no native tool interception, retries, file edits or bypasses. For long tasks, use `save_checkpoint` with `conversation_id`, `task_summary`, `completed`, `next_steps`, `decisions` and `pending_tests`; retrieve with `model_recovery`. Checkpoint notes are not verified facts, and changed source revisions make them stale.

**Native teamwork:** `a2a_context(action="orchestration")` only recommends explicitly available native modes when low dependencies and **independent file ownership** are declared; user approval is always required, and A2A never launches workers.

## Token accounting

`a2a tokens` reads *available local* Antigravity conversation metadata, including historical sessions when explicitly requested. Internal log counts, source-size estimates, response-size estimates, provider-confirmed usage and actual cost **are different things**. Do not infer measured savings from shorter previews, local telemetry, or repeated reads. Official usage can be supplied with `--usage-file` after an eligible native headless run. See [token provenance](docs/TOKEN_PROVENANCE.md) and [A/B evaluation](docs/AB_EVALUATION.md).

## Documentation

Start at the [documentation index](docs/README.md). Key references:

- [Current MCP and SQLite contracts](docs/CONTRACTS.md)
- [Architecture](docs/ARCHITECTURE.md) · [Native-first workflow](docs/NATIVE_FIRST_WORKFLOW.md)
- [Behavioral Five Whys and E2E boundaries](docs/BEHAVIORAL_5_WHYS_V2_0_1.md)
- [Checkpoint and model/tool recovery](docs/CHECKPOINT_RECOVERY.md)
- [Security, trust and privacy](docs/SECURITY.md)
- [Independent acceptance](docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md) · [release authorization](docs/RELEASE_AUTHORIZATION.md)
- [v2.0.1 change traceability](docs/V2_0_1_TRACEABILITY.md)

**Unfinished external gates:** live Antigravity install/browser tests; actual independent STOCKROOM F01–F18 HTTP/browser/database cases; controlled repeated Native/A2A benchmarks; independent evidence/approval and explicit `main` promotion. Tracked in [issue #15](https://github.com/alifakbxr/a2a/issues/15). Green Node CI does not close these.

## License

[MIT](LICENSE) © 2026 Alif Akbar and contributors.

### Low-token operating practice

The plugin skill now uses **zero A2A calls for simple/native-solvable work** and normally **one scoped query OR impact summary** when uncertainty is material. Do not chain tools just to repeat information, invoke token reports after every step, or use a full skeleton before asking for a specific symbol. Typed verification and evidence recovery are used only when their distinct purposes require them. Always-On remains opt-in and only injects a short policy on `SessionStart`.

Default Compact limits `a2a_context(action="skeleton")` to **4,800 preview characters total, 1,600 per file and six full previews**; additional requested files are disclosed as omitted. Compact `action="query"` returns at most **12 static relations**, with a truncation flag and original response count when clipped. These are **output budgets**, not a guarantee of lower model billing or better answers. For complex work requiring complete context, opt out with `compact off` and inspect the source natively. See [token measurement](docs/TOKEN_EFFICIENCY.md).

### Node 26 + NVM on Linux

If `which node` resolves to `~/.nvm/versions/node/v26.13.1/bin/node`, the Node runtime is suitable for A2A's tested core. Check the *actual* binary and SQLite API with `node scripts/a2a.mjs doctor` (look for `node_binary`, `sqlite_api`, `sqlite_version`). The plugin's MCP launcher invokes `node` via `PATH`, which might be different in Antigravity launched from the desktop. Check the IDE's environment when the plugin fails to start; do not assume the NVM binary visible in your terminal is also visible to the GUI. See [compatibility and validation](docs/COMPATIBILITY.md).

## Adaptive 5 Whys for difficult bugs

For recurring regressions, concurrency/permission failures and ambiguous causes, A2A's lean skill recommends **native, evidence-guided 5 Whys** rather than asking exactly five questions or issuing five tool calls. Antigravity records symptoms, competing explanations, a falsifying experiment and negative controls. RCA-lite can run with **zero additional A2A calls**; opt-in RCA-deep uses `a2a_evidence(record_incident|add_hypothesis|assess_hypothesis)` with `persist_rca:true` and exact source-fresh named-test evidence. Outcomes `locally_supported`, `refuted`, and `inconclusive` are not independent causal proof; an incident's `root_cause` remains **candidate-only**. View the [RCA workflow and examples](docs/ADAPTIVE_RCA_WORKFLOW.md). Release acceptance #15 remains open.

**RCA history privacy:** Compact lists show at most eight entries and disclose additional records. To logically remove a saved RCA incident with its hypotheses, explicitly invoke `a2a_evidence(operation="delete_incident",persist_rca=true,confirm_deletion=true,incident_id="...")`; this does **not** delete independently stored test artifacts or securely erase database backups. [Details](docs/ADAPTIVE_RCA_WORKFLOW.md).

