# A2A Intervention Ledger

The source-checkout utility from [issue #13](https://github.com/alifakbxr/a2a/issues/13) maps **observed** A2A calls to subsequent observable agent activity without inferring causal effectiveness.

```bash
node scripts/intervention-ledger.mjs transcript.jsonl
```

Output contains per-call step, sanitized tool name, result classification, next observable planner step, timestamp and output byte count. Arguments, file paths, raw prompt contents and model text are deliberately omitted. Ambiguous multi-tool steps are marked **incomplete**, not credited.

**Important:** a successful `a2a_impact` invocation does not prove A2A saved tokens or produced a better application. Such statements require matched independent Native/A2A runs, observable outcome checks and provider-reported usage where available. The ledger may miss calls unavailable in the archived transcript.

Current behavioral reliability implementation is in [PR #36](https://github.com/alifakbxr/a2a/pull/36), merged to `v2.0.1`, but its local E2E does not validate third-party model outcomes. See [trace comparison](AGENT_TRACE_BENCHMARK.md), [token provenance](TOKEN_PROVENANCE.md), and [A/B evaluation](AB_EVALUATION.md).

### 20 November 2026 classification update

[PR #86](https://github.com/alifakbxr/a2a/pull/86) recognizes Antigravity's direct namespaced tool names such as `a2a_a2a/a2a_context` and `mcp__a2a_a2a__a2a_context`, in addition to `call_mcp_tool`. A transport-level `DONE` event containing an MCP `status:error`, `isError:true` or categorized code is recorded as a **failed invocation**, not an A2A success. Output remains metadata-only and will not include command arguments, paths, raw result content or private transcripts. Missing tool results remain unknown, not success. A zero count is an observation of the supplied trace only; it is not evidence that the skill was unavailable, that an agent made a correct skip decision, or that A2A has no value.

### Selection-vs-availability controls (21 November 2026)

A complete local archive with 13 distinct full transcripts had 611 native tool calls and zero A2A calls despite 13 injected Always-On prompts; no bundled trace contained the earlier STOCKROOM Order audit. This is observational, not an independent benchmark. The new eager `a2a_context` registration ensures its full parameter schema *should* be exposed upfront to **enabled parent sessions** under documented Antigravity behavior; it does not guarantee any call or subagent inheritance. Compare high-risk cross-file tasks and a trivial negative control with the same model/effort, record `/mcp`/skill inclusion from the live host and **provider-reported** token usage. Do not infer correct/incorrect tool choice from counts alone.

### Eager namespacing accuracy (issue #71)

The ledger recognizes Antigravity's native eager function form `mcp_a2a_a2a_a2a_context` as well as plugin-qualified and lazy forms. A same-named `a2a_context` operation on an unrelated MCP server is **not** an A2A event. No raw arguments or private output is published. The observed counts remain diagnostic only, not proof of token savings or correct model selection.
