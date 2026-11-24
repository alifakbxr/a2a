# PILAH — native-first workflow

**Current workflow for PILAH v2.1.0** on Antigravity; replaces historical PILAH branch instructions. The plugin does not launch agents, run browser/terminal tools, edit source, bypass permissions or automatically switch models.

## Choose the least expensive sufficient path

| Task | PILAH action | Native Antigravity action |
| --- | --- | --- |
| Isolated edit, clear bug, documentation or ordinary styling | **0 calls** | Inspect and edit directly, run proportionate tests |
| Unknown caller or cross-file ownership | At most one scoped `pilah_context(query)` **or** `pilah_impact(summary=true)` | Inspect actual affected code, not the whole repository |
| High-risk stateful change | `pilah_impact` if uncertainty remains; `pilah_verify(plan)` only if structured acceptance adds value | Test negative paths, tenant/role boundaries, persistence, idempotency, concurrent writes |
| Ambiguous or recurring failure | Evidence-backed falsifiable RCA; `pilah_evidence` only when opt-in history is genuinely needed | Reproduce → hypothesis → discriminating test → minimal complete fix |
| UI/browser behavior | Optional typed plan with viewport, state, reference | Run actual browser interactions, responsive and negative states |
| Long handoff / recovery | Explicit checkpoint, not automatic retention | Confirm completed work, remaining tests, source freshness |
| Release | Signed external acceptance gate, if supplied | Independently execute real app scenarios and obtain human approval |

**No hard quota of one call for every task:** the initial call is scoped; a second distinct call is justified only by new evidence or a different unresolved question. Avoid needless full-file dumps, repetitive token diagnostics and redundant skill loading. For many authorized repetitive operations, a short reviewed native script with bounded output is often better than repeated tool turns; do not bypass approval or inspect private files.

## Quality boundary

A `pilah_verify(operation="plan")` result starts at `not_tested`. Only actual named test reports can establish local assertions. Local pass ≠ independently accepted E2E, browser/visual parity, real printer or financial/security correctness. `assess_browser` and `assess_semantic` inspect supplied artifacts; they do not independently execute a browser. A false-pass, missing test, stale build or ambiguous run status must stay unresolved. Do not disable tests or narrow scope to manufacture a passing benchmark.

## Agent teams and context

Native `/teamwork`, worktrees and subagents may be suggested **only** if the actual Antigravity build/account supports them, workstreams have independently owned files and the user opts in. PILAH does not implement distributed worker coordination or separate per-agent model routing. Leave Context Guardian disabled unless explicitly enabled; its 80/140-step milestones are heuristics, not provider context-token thresholds.

Use [skill](../skills/pilah/SKILL.md), [engineering method](ENGINEERING_METHOD.md), [contracts](CONTRACTS.md), [CI evaluation](CI_EFFICIENCY.md) and [independent acceptance backlog](MAIN_VALIDATION_BACKLOG.md). Historic `v2.0.1` root-cause reports remain in the [documentation index](README.md) for audit history only.
