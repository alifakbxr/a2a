# A2A Architecture — v2.0.1 development candidate

A2A is a local-first, native-first **engineering intelligence support layer** for Antigravity. It is neither a model nor a proxy for native terminal/browser/agents. The plugin owns static context, guidance, metadata, evidence accounting and controlled local recovery; **Antigravity** owns project edits, terminal/browser actions, workspace permissions, and any native model/teamwork execution.

## Re-audit invariants (19 November 2026)

- Both `a2a_verify(assess)` and `a2a_verify(verify_handoff)` share `localEvidencePolicy`; restricted browser/visual/hardware/security/independent acceptance remains **unattested** by local reports.
- The optional `acceptance_plans` table stores immutable user-authored, revision-bound scenario scope only when `persist_plan:true`; missing or modified criteria cannot disappear from a bound assessment.
- Native PostToolUse reports distinguish confirmed zero exit, nonzero exit, and unknown/conflicting status. Only the first can contribute local test-run provenance.
- Automatic Antigravity brain Markdown **full-content** history is default **off** and requires explicit `a2a artifact-autosnapshot on`; manual snapshots remain explicit.
- Permission-denied recovery takes safety precedence over argument/page ID heuristics.
- The release still requires independently signed evidence and F01–F18/Antigravity acceptance under issue #15.

## Architectural invariants

1. **Four public MCP tools, no added runtime dependencies.** `a2a_context`, `a2a_impact`, `a2a_verify`, `a2a_evidence` communicate via JSON-RPC 2.0 stdio on Node >=22.13.0. Legacy aliases remain optional.
2. **Workspace security:** all source reads and evidence storage originate from an authorized, canonical project root. Protected roots, unsafe symlinks, cross-workspace reads and revoked workspaces are denied.
3. **Source freshness:** SHA-256 source revision including uncommitted edits and separately hashed evidence artifacts. Cached static metadata is never a license to present stale proof.
4. **Evidence scope:** local JUnit/TAP/JSON assertions are NOT independent confirmation of browser UI, hardware, security, or production readiness. `completion.fully_verified` is deliberately false for local reports.
5. **Adaptive, bounded workflow:** On-Demand is default, so no policy is injected for ordinary sessions; Always-On is opt-in with one short `SessionStart` message. Compact responses are default on new installations but can be explicitly disabled; query/skeleton truncation is disclosed. Native trivial work needs no A2A call.
6. **No automatic network service or arbitrary project execution:** the explicit `refresh` command only uses loopback Antigravity RPC; separately, the **opt-in** `stats` CLI uses the external `gh api` command to fetch GitHub traffic metrics. Core MCP, hooks, graph and verification do not make outbound network calls. A2A does not run project scripts, browsers, model calls or subagents.

## Modules and responsibilities

| Component | Responsibility | Explicit limitation |
| --- | --- | --- |
| [`src/security.mjs`](../src/security.mjs) | Workspace trust/revocation, protected paths, settings, safe artifact access | Same-OS-user processes can modify local state |
| [`src/scanner.mjs`](../src/scanner.mjs) | Multi-stack source scanning, hashes and symbol/import heuristics | Not a full compiler/LSP for every language |
| [`src/graph.mjs`](../src/graph.mjs) | Batched static graph queries, reverse-impact traversal | Derived relationships are candidates |
| [`src/storage.mjs`](../src/storage.mjs) | Private SQLite, source index, revisions, test evidence, snapshots, notes | Opt-in artifacts/notes may contain user-supplied text |
| [`src/tokens.mjs`](../src/tokens.mjs), [`src/conversations.mjs`](../src/conversations.mjs) | Lexer-safe previews, local conversation provenance, source-response size estimates | Local counters are not provider-billed token usage |
| [`src/verification.mjs`](../src/verification.mjs), [`src/acceptance-matrix.mjs`](../src/acceptance-matrix.mjs) | Given/When/Then plans, exact-test checks, scoped completion | Local PASS never becomes independent E2E approval |
| [`src/semantic-evidence.mjs`](../src/semantic-evidence.mjs), [`src/browser-evidence.mjs`](../src/browser-evidence.mjs) | Structural evaluation of supplied evidence | Caller-supplied execution remains unattested |
| [`src/model-recovery.mjs`](../src/model-recovery.mjs) | Categorized model errors and explicit source-fresh checkpoints | No model switch, quota query, or automatic resume |
| [`src/native-tool-recovery.mjs`](../src/native-tool-recovery.mjs) | Deterministic, bounded remediation classes | No native interception, automatic retry, or permission bypass |
| [`src/orchestration-advisor.mjs`](../src/orchestration-advisor.mjs) | Opt-in native worker-mode recommendation | Needs declared capabilities, low coupling and independent file ownership |
| [`src/mcp.mjs`](../src/mcp.mjs), [`src/engine.mjs`](../src/engine.mjs) | Stdio protocol, public API orchestration, output bounds and state | No project-code mutation tool |

## Execution flow

```mermaid
sequenceDiagram
    actor U as User
    participant A as Antigravity
    participant M as A2A MCP
    participant F as Authorized workspace
    participant D as Local SQLite
    U->>A: Fix and verify behavior
    opt Risk/unknown code makes A2A useful
        A->>M: context query / impact summary
        M->>F: Read permitted source paths
        M->>D: Index static graph, source revision
        M-->>A: Candidate files, risk, coverage uncertainty
    end
    A->>M: verify plan (Given/When/Then; evidence_type)
    M-->>A: NOT_TESTED criteria + risk guidance
    A->>A: Native edits, testing, browser/device (if available)
    opt Completed local machine report exists
        A->>M: verify assess (exact testcase, report)
        M->>F: Verify local report hash/revision
        M->>D: Record scoped result + evidence
        M-->>A: Local assertion verdict; fully_verified=false
    end
    opt Explicit pause or tool failure
        A->>M: evidence checkpoint or tool_recovery
        M-->>A: Unverified notes / nonexecuting recovery advice
    end
    A-->>U: Implemented vs. tested vs. untested + blockers
```

For a release eligibility decision, a separate independent runner freezes F01–F18, signs machine evidence and obtains an additional reviewer signature on the exact candidate. The fail-closed publication gate also checks the approved `main` SHA. Neither an internal A2A plan nor green CI substitutes for that process.

## Revisions, graph and data handling

- Source fingerprints are computed from tracked relevant workspace paths and content SHA-256, not just Git commits. Recognized A2A generated report JSON is excluded from **source** fingerprint to avoid self-referential loops; evidence bytes are independently hashed.
- Path/mtime/size caching accelerates ordinary indexing; `verifyIntegrity` paths rehash content before making freshness/verification claims.
- Local SQLite holds indexed source metadata and graph, evidence/run history, incident records, bounded telemetry, optional Markdown artifact contents/diffs, and explicit checkpoint notes. **Do not promise source content is never stored:** explicitly snapshotted Markdown is retained locally.
- Case-specific browser/semantic structural checks are conservative and never cryptographically prove a user's live browser or database.
- Actual file edits, model retries and hardware operations happen **outside A2A** using permitted native Antigravity facilities.

## Plugin lifecycle

- `plugin.json`: plugin metadata and version.
- `mcp_config.json`: Node stdio server.
- `hooks.json`: `SessionStart` and **targeted `PostToolUse`**, never `PreInvocation`; bounded local metadata, best-effort behavior.
- `rules/AGENTS.md`: tiny permanent guidance (<400 chars); Always-On adaptive policy at session start only when explicitly enabled.
- `skills/a2a/SKILL.md`: native-first operational guidance; actual tools are in the generated MCP schema.

## Validation boundaries

The repository CI executed **213/213 Node tests on Ubuntu Node 22** and succeeded on four OS/runtime jobs after behavioral PR #36 merged to `v2.0.1`. The E2E component starts a **real local MCP subprocess and SQLite** to exercise authorization, planning, false-PASS cases, checkpoint freshness and recovery. It does **not** test live Antigravity UI/Figma, printer hardware, Laravel HTTP/database invariants or the 18-case external STOCKROOM run.

See [contracts](CONTRACTS.md), [security](SECURITY.md), [behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md), [acceptance runbook](INDEPENDENT_ACCEPTANCE_RUNBOOK.md) and [release engineering](RELEASE.md).
