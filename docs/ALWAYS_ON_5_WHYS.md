> **Historical research record:** Terminology has been standardized to PILAH. Dates, CI results and observed limitations refer to the source revision investigated at that time, not necessarily the current plugin.

# Always-On Token Efficiency: Five-Whys Scenarios

## Scope and evidence level
**Code-observed:** persistent plugin rules, lifecycle hooks, skeleton output, repeated tool instructions, estimated telemetry. **Not yet measured:** per-task increase/decrease in Gemini token consumption. Use [TOKEN_EFFICIENCY.md](TOKEN_EFFICIENCY.md) for real A/B trials. Do not turn these causal hypotheses into claimed percent savings.

## Scenario 1 — Simple typo edit consumes unnecessary context
1. **Why** may the task use more input tokens? Plugin guidance is present even for a trivial change.
2. **Why** is guidance always present? The bundled `rules/AGENTS.md` is continuously active, independent of the current mode.
3. **Why** was it large? The rules bundled all verification, dependency, token metrics and teamwork procedures.
4. **Why** are those unnecessary? A one-file typo does not require graph analysis, handoff reports or incident handling.
5. **Why** was there no separation? Mode-specific decisions were expressed as persistent instructions rather than a concise router plus a one-time policy.

**Fix:** Reduce persistent rule to a tiny router; inject adaptive Always-On guidance at `SessionStart` only when enabled. Never auto-call PILAH for docs, typos, styles or isolated changes. **Proof:** static size budget test for `rules/AGENTS.md`, hook startup test.

## Scenario 2 — The agent asks for skeleton and still reads full source
1. **Why** might two context payloads be consumed? Both skeleton output and native full-source output reach the model.
2. **Why** are both used? The agent still needs implementation details after initial navigation.
3. **Why** does skeleton often not answer that need? `skeletonizeCode()` strips comments/blank lines, not method bodies.
4. **Why** was it treated as a general context replacement? The policy encouraged skeletonization for every unfamiliar file.
5. **Why** did this persist? The savings calculation compares hypothetical raw source with skeleton output, not two complete task traces.

**Fix:** In Always-On, use `PILAH_context(action="query")` for names/locations. Use skeleton only for orientation, avoid the full-read duplication when the preview suffices, and use native reads for exact implementation. **Proof:** rule/skill contract review; require empirical A/B for net effect. A true semantic outline parser is out of scope and is not claimed.

## Scenario 3 — Every meaningful edit causes a chain of optional checks
1. **Why** does agent reasoning/tool output grow? It calls impact, context, plan, testing, assess and history in sequence.
2. **Why** does it call every stage? The workflow's descriptions looked mandatory rather than conditional.
3. **Why** was no early exit allowed? The policy lacked an explicit minimum-work stop condition.
4. **Why** did impact contribute output bloat? The full response includes up to 25 affected items, multiple test files and telemetry.
5. **Why** wasn't a light first-pass available? PILAH offered only the full impact payload.

**Fix:** Add `PILAH_impact(summary=true)` as a one-call triage that caps affected/test previews but **retains risk, uncertainty, coverage flags, and full counts**. Expand only when needed. Skip token telemetry in summary. Do not automatically call `plan` and `assess` if direct report assessment suffices. **Proof:** summary contract and integration test ensure smaller payload and no missing uncertainty.

## Scenario 4 — High-frequency lifecycle hooks add repeated work
1. **Why** is there overhead during each turn? The plugin spawns a Node process in `PreInvocation`.
2. **Why** does the process run so often? Antigravity fires `PreInvocation` before model calls.
3. **Why** does PILAH use it? To maintain active session metadata.
4. **Why** is that repetitive? Most session identifiers are stable until a new conversation.
5. **Why** wasn't `SessionStart` sufficient? The original architecture registered a hook for every lifecycle opportunity.

**Fix:** Remove `PreInvocation` from `hooks.json`. Use the officially supported `SessionStart` session ID, retain targeted `PostToolUse` for test/artifact bookkeeping. This reduces local CPU/process overhead, **not automatically model tokens**. **Proof:** hook configuration test. Mid-session mode toggles are communicated by command responses; start a new conversation for guaranteed startup-policy refresh.

## Scenario 5 — Dashboard reports savings while total session tokens increase
1. **Why** can reported savings be positive? `tokens_saved=max(0, raw_scope_tokens-response_tokens)`.
2. **Why** is `raw_scope_tokens` a generous baseline? It estimates how much source **might** be read.
3. **Why** isn't this net savings? Native may not read that scope, and PILAH adds its own instructions, reports and follow-up calls.
4. **Why** aren't those included? Local telemetry sees size of its own outputs, not a counterfactual native task.
5. **Why** was this called measured? Scoped data was confused with controlled model-session consumption.

**Fix (implemented in PR #2):** Stop exposing computed `tokens_saved`, savings percentages or dollar savings as if observed. Display source-size and tool-response estimates separately, keep net savings `null`, and accept only officially reported Antigravity CLI JSON for per-run usage. For task-level savings, a controlled [A/B evaluation](TOKEN_EFFICIENCY.md) is mandatory.

## Always-On policy invariants
- **Correctness first:** no output compression that hides `risk`, `uncertainty`, `freshness`, or evidence status.
- **No false PASS:** relevant native tests + mapped acceptance evidence are still required for testable code deliverables.
- **No redundant work:** one impact triage per affected scope; context lookup only when needed; no auto history/telemetry calls.
- **Native-first:** PILAH does not force Teamwork, subagents, tool execution or a particular browser.
- **Privacy:** do not use internal transcripts as a billing-grade source or include private session data in task output.

## Acceptance criteria
1. Default `on-demand` adds no startup instruction injection; explicit `always-on` injects one adaptive policy.
2. Persistent rule fits a 400-character budget. `PreInvocation` does not spawn PILAH.
3. `PILAH_impact(summary=true)` reports full risk/uncertainty and is smaller than the comparable full response on a dependency fixture.
4. MCP `verify_handoff` accepts its documented parameters and does not require reports for research-only tasks.
5. CI runs on Windows, macOS and Linux.
6. Publish no net token savings percentage until controlled sessions demonstrate it.

## Official platform references
- [Google Antigravity — Rules](https://antigravity.google/docs/rules/)
- [Google Antigravity — Hooks](https://antigravity.google/docs/hooks)
- [Google Antigravity — Build plugins](https://antigravity.google/docs/build-plugins/)

## Current v2.0.1 behavioral alignment

The historical Always-On improvements remain present: on-demand by default, tiny rule, no PreInvocation, scope-limited summary and no invented token savings. Behavioral PR #36 subsequently added **typed Given/When/Then acceptance with evidence types**, **source-fresh explicit checkpoint decisions**, nonexecuting native tool failure guidance, and a stricter independence requirement for parallel teamwork recommendations. Only request these optional tools when they materially reduce uncertainty; never transform the 71.5% repeated-read *path* statistic into a measured token saving. A green local report does not make `completion.fully_verified` true. Live IDE and controlled performance benefits are still open in issue #15.
