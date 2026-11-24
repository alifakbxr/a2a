# PILAH Intervention Ledger

The source-checkout utility from issue #13 maps **observed** PILAH calls to subsequent observable agent activity without inferring causal effectiveness.

```bash
node scripts/intervention-ledger.mjs transcript.jsonl
```

Output contains per-call step, sanitized tool name, result classification, next observable planner step, timestamp and output byte count. Arguments, file paths, raw prompt contents and model text are deliberately omitted. Ambiguous multi-tool steps are marked **incomplete**, not credited.

**Important:** a successful `PILAH_impact` invocation does not prove PILAH saved tokens or produced a better application. Such statements require matched independent Native/PILAH runs, observable outcome checks and provider-reported usage where available. The ledger may miss calls unavailable in the archived transcript.

Current behavioral reliability implementation is in PR #36, merged to `v2.0.1`, but its local E2E does not validate third-party model outcomes. See [trace comparison](AGENT_TRACE_BENCHMARK.md), [token provenance](TOKEN_PROVENANCE.md), and [A/B evaluation](AB_EVALUATION.md).

### 20 November 2026 classification update

PR #86 recognizes Antigravity's direct namespaced tool names such as `PILAH_PILAH/PILAH_context` and `mcp__PILAH_PILAH__PILAH_context`, in addition to `call_mcp_tool`. A transport-level `DONE` event containing an MCP `status:error`, `isError:true` or categorized code is recorded as a **failed invocation**, not an PILAH success. Output remains metadata-only and will not include command arguments, paths, raw result content or private transcripts. Missing tool results remain unknown, not success. A zero count is an observation of the supplied trace only; it is not evidence that the skill was unavailable, that an agent made a correct skip decision, or that PILAH has no value.

### Selection-vs-availability controls (21 November 2026)

A complete local archive with 13 distinct full transcripts had 611 native tool calls and zero PILAH calls despite 13 injected Always-On prompts; no bundled trace contained the earlier STOCKROOM Order audit. This is observational, not an independent benchmark. The new eager `PILAH_context` registration ensures its full parameter schema *should* be exposed upfront to **enabled parent sessions** under documented Antigravity behavior; it does not guarantee any call or subagent inheritance. Compare high-risk cross-file tasks and a trivial negative control with the same model/effort, record `/mcp`/skill inclusion from the live host and **provider-reported** token usage. Do not infer correct/incorrect tool choice from counts alone.

### Eager namespacing accuracy (issue #71)

The ledger recognizes Antigravity's native eager function form `mcp_PILAH_PILAH_PILAH_context` as well as plugin-qualified and lazy forms. A same-named `PILAH_context` operation on an unrelated MCP server is **not** an PILAH event. No raw arguments or private output is published. The observed counts remain diagnostic only, not proof of token savings or correct model selection.
