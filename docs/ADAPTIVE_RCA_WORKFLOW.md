# Adaptive 5 Whys — evidence-guided RCA in A2A v2.0.1

**Status:** Local software workflow and verification contract; not an automatic investigator, model chain, forensic proof, native test runner or independent release approval. See [issue #48](https://github.com/alifakbxr/a2a/issues/48) and the original [behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md).

## Zero-first workflow

1. **Fast path (zero RCA tool calls):** simple typo, isolated change or cause already reproduced and understood → native edit and targeted regression. Do not invoke A2A merely to ask five questions.
2. **RCA-lite (native reasoning, zero or one context/impact call):** for uncertain nontrivial bugs, state expected versus actual, the observed symptom, one or two *competing* causes, a falsifier for each and the cheapest differentiating experiment. A chain may stop after two or three Whys. No storage unless explicitly approved.
3. **RCA-deep (opt-in):** recurrent failure, regression after a fix, inconsistent browser/printer result, concurrency, authorization, financial effects or multi-module ambiguity. If useful, one targeted `a2a_context(query,limit=5)` OR `a2a_impact(summary=true)`. The native Antigravity agent still runs experiments; A2A records only explicitly approved, bounded structured notes.
4. **Evidence:** use a real named unit/integration JUnit/TAP/A2A JSON testcase with `a2a_verify(assess)`. Do not infer a root cause from a successful build, UI test name, tester's narrative or the mere presence of an evidence ID.
5. **Countermeasure:** minimize the fix; include controlled negative controls, recurrence scenario and non-regression cases. Re-check source revisions and evidence artifacts after any edit. Report separately what the test supports, what was refuted and what remains unverified.

## Explicit local RCA lifecycle (four existing MCP tools)

### 1. Record observed incident (not a proven root cause)

```json
{
  "workspace": "/authorized/project",
  "operation": "record_incident",
  "persist_rca": true,
  "title": "Second QR scan triggers duplicate print",
  "root_cause": "Possible UI handler replay",
  "paths": ["src/checkin.js"]
}
```

Invoke via `a2a_evidence` only with user consent to retain RCA text locally. `root_cause` is retained for backwards compatibility but treated as a **candidate**, never verified. Incident state is `investigating`. A linked evidence ID is checked for authorized workspace, fresh source and intact artifact, but **does not prove relevance or cause**. A repeat incident signature may suggest a prior related incident ID, not its cause.

### 2. Create falsifiable hypothesis

```json
{
  "workspace": "/authorized/project",
  "operation": "add_hypothesis",
  "persist_rca": true,
  "incident_id": "<incident ID>",
  "hypothesis": "The check-in UI sends the same print event twice",
  "experiment": "Disable UI handler, replay one check-in and compare server print counts",
  "predicted_observation": "No second print after disabling the handler",
  "disconfirming_test": "Observe duplicate backend queue prints with UI handler disabled",
  "expected_criterion_id": "qr-print-guard"
}
```

Optional `parent_hypothesis_id` creates **branches** of a Why chain up to eight levels; multiple hypotheses can represent competing causes. Optional `plan_id` ensures the criterion belongs to an intact, current, opt-in acceptance plan. An arbitrary string is **not** an executed test or independent witness.

### 3. Run native test then assess it

Run the controlled experiment with native Antigravity tools. Produce JUnit/TAP/A2A JSON and assess the *exact named* unit/integration test with `a2a_verify(operation="assess")`. Capture its `evidence_id`. Then:

```json
{
  "workspace": "/authorized/project",
  "operation": "assess_hypothesis",
  "persist_rca": true,
  "hypothesis_id": "<hypothesis ID>",
  "experiment_outcome": "supports",
  "observation": "The named regression passed after suppressing the duplicate handler",
  "evidence_ids": ["<fresh exact named-test evidence ID>"]
}
```

Allowed outcomes: `supports`, `refutes`, `inconclusive`. Results are `locally_supported`, `refuted` or `inconclusive`, **never `proven`**. For supports/refutes, the evidence must be a passing exact named **unit/integration** assertion for the hypothesis' `expected_criterion_id`, from the same authorized workspace/source revision and an intact report. A passing negative-control test can be submitted with the agent's interpretation `refutes`; that interpretation is not cryptographically attested. **Failed, build-only, visual, browser, hardware, security, stale, unrelated and altered artifacts cannot promote a hypothesis.**

### 4. Read status and re-evaluate when source changes

`a2a_evidence(operation="hypotheses",incident_id="...")` lists branches, recorded outcomes and source freshness; `operation="incidents"` shows candidate causes with `root_cause_verified:false`. When source changes, old hypotheses are reported `stale`; create a new reviewed hypothesis and run new tests. Do not silently reuse an earlier `locally_supported` status. The final response distinguishes **reproduced, locally supported, refuted, stale, blocked and untested**.

## Safety and token budget

- Default **On-Demand**: no automatic RCA calls, session notices, extra models or teamwork. Compact output retains all causal proof warnings. The skill adds only one short adaptive branch, staying under its existing 3,000-character CI limit.
- **Consent:** `persist_rca:true` is required for local writes. Persist only minimal text; common plaintext secret assignments are rejected as defense in depth, not perfect secret filtering. No raw transcripts, credentials or customer artifacts should be copied into notes.
- **Bounded:** max 8 Why depth, up to 20 evidence links, 40 criteria and standard MCP response limits. Existing SQLite history remains locally stored; disabling other snapshot features does **not** automatically erase RCA records.
- **No automatic evidence creation:** risk-guidance templates are suggestions, `required_test_ids` remains empty for that advisory, and only explicit user-reviewed acceptance criteria are mandatory.
- **Locality vs causality:** a named passing unit/integration assertion and an agent's observation may be useful diagnostic support, but they cannot independently establish production behavior or causal truth. The signed release process is separate.

## Regression acceptance

The repository tests cover consent, hypothetical competing causes and parent branches, refutation, missing/unrelated/build-only/altered/stale evidence, source revision changes, existing SQLite migration, Compact warnings and actual MCP stdio+SQLite lifecycle. These are **synthetic tests**. The [external release issue #15](https://github.com/alifakbxr/a2a/issues/15) still requires real installed Antigravity, F01–F18, browser/physical printer where applicable, independent validation and repeated matched Native/A2A trials with official provider usage.

Source of truth: [`src/rca.mjs`](../src/rca.mjs), [MCP contracts](CONTRACTS.md), [database schema](../schemas/database.sql), [tests](../tests/rca_lifecycle.test.mjs).

### 5. Inspect bounded history or delete RCA notes

In default Compact, `a2a_evidence(operation="incidents"|"hypotheses")` returns up to **8** entries, including `total`, `more_available` and a proof-warning. Use `compact off` to inspect up to 50 records. Reading a prior locally supported/refuted hypothesis re-checks all its linked artifact hashes; missing/modified evidence changes the displayed status to **stale**, even if source revision itself is unchanged.

For explicit local cleanup, `a2a_evidence(operation="delete_incident",incident_id="...",persist_rca=true,confirm_deletion=true)` logically removes **one** incident and its attached hypotheses, leaving independent test artifacts, acceptance plans and other incidents untouched. Require user approval: deletion cannot be undone through A2A, but SQLite WAL/backups may retain old bytes, so it is **not cryptographic erasure**. Do not claim this deletes all related personal data.

Each assessment also appends a local immutable-in-application **experiment history entry** (observation, outcome, exact criterion, evidence IDs, revision and time). The `hypotheses` response returns up to three recent outcomes and the `experiments_total` count; it never upgrades those user-reported interpretations to independent proof. Deleting an incident logically deletes its hypotheses **and this experimental history**, leaving unrelated reports intact.

