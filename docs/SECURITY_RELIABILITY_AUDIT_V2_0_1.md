# A2A v2.0.1 — Security, Reliability and Integrity Audit
**Date:** 18 November 2026  
**Target:** `v2.0.1` only  
**Release verdict:** **NO-GO pending independent acceptance**.

## Audit boundaries

This audit reviewed A2A's Node-only MCP/CLI, local workspace authorization, hook/transcript handling, SQLite persistence, evidence assessment, indexing, and cross-platform regression contracts. Changes were made on `v2.0.1` with no new runtime dependencies or public MCP tools. Existing tests and GitHub Actions prove bounded code behavior, **not full operational security or end-to-end acceptance**.

## Implemented controls

| Area | Code hardening | Regression focus |
|---|---|---|
| Workspace trust | Explicit `revoke` is a persistent denial overriding Antigravity's automatic trust; allowing the exact workspace restores access. Broken grants files fail closed. The allow/revoke record is replaced atomically. | Autotrust, revoke, reapprove, corrupt grants |
| Path boundaries | Protected credential-store descendants and nested ignored paths cannot be ordinary workspace/artifact reads. Brain Markdown exception checks the directory chain for symlinks. | Sensitive subtree and brain symlink escape |
| RPC and tool input | MCP notifications cannot execute data-changing handlers. Object prototype keys are not accepted as schema fields. The CLI refresh RPC accepts loopback hosts only and does not expose the server error body. | Invalid parameters, no-id calls, CSRF endpoint validation |
| Session privacy | Transcript reads require an exact Antigravity brain layout, canonical containment, and no symlink components. Session metadata is bounded, atomically replaced, and hooks reject oversized input. | Hook path injection, transcript redirection, large input |
| SQLite | SQLite and WAL/SHM paths reject symlinks; schema trust is disabled; unverified legacy raw-copy migration fallback was removed. Data directory cannot be root/HOME/shared tmp or world-writable. | File redirection, shared-root permissions |
| Artifact history | Version allocation and retention are serialized in SQLite. Shadow files remain optional and cannot follow symlinked directories. Explicitly missing versions are reported as missing, not compared with invented empty content. | Multi-version retention, unsafe shadows, missing diffs |
| Verification | Local multi-criterion evidence and run record writes use a single transaction. Read-only evidence/run freshness recalculates the source fingerprint, while evidence bytes have their own integrity hash. | Rollback on invalid later criterion, stale source edits |
| Source indexing | Inspect, query, impact, skeleton and verification checks verify source bytes before presenting revision-dependent conclusions. Recognized generated A2A reports are excluded from the application-source fingerprint, not from independent evidence hashes. | Same-size and same-mtime source changes |
| Semantic and browser evidence | Built-in semantic requirements cannot be removed by caller input. Duplicate browser assertions are rejected; JSON observations are compared structurally, not by object key insertion order. Reports remain **unattested**. | Bypass attempts, duplicated checks, object-order false negatives |
| Performance and orchestration | Graph traversal avoids repeated array shifts and correctly reports truncation only when there are unvisited nodes. The agent advisor does not presume paid worker availability or start workers. | Queue traversal, consent/capability constraints |

## Verification and safety interpretation

CI runs `npm test`, release/schema checks, package dry-run checks, and syntax checks across Ubuntu Node 22/24, Windows Node 22, and macOS Node 22. The GitHub Actions result associated with the final branch head is the authoritative CI evidence; cancelled intermediate pushes are **not** successful validations.

An automatically reported `passed` test does not mean a forged/compromised test runner was detected, a browser actually loaded the stated build, or a production system is secure. Evidence reports have explicit provenance and freshness limitations, and external signed evidence still only establishes the configured signer's claim, not the underlying real-world behavior.

**Tradeoff:** high-confidence revision-sensitive operations now rehash source content. This avoids stat-cache freshness errors but may increase I/O latency on large workspaces. Run repeatable performance and A/B measurements before claiming a performance improvement. A2A's static graph and bounded index cannot establish complete runtime coverage.

## Blocking work — not certified or complete

- Execute all 18 frozen STOCKROOM cases F01–F18 against isolated **running** backend/browser/database systems, including actual overlapping transactions, process-level browser restart, account switching, refunds and tenant security.
- Perform a fresh real-world Antigravity installation, MCP handshake and permission/revocation smoke test, including an interrupted session and actual OS-specific integration behavior.
- Run repeated, comparable Native vs prior baseline vs `v2.0.1` Antigravity experiments, with official usage where available and separately scored code quality/acceptance.
- Independently review test provenance, privacy, malicious same-user filesystem races/TOCTOU, corruption and process-crash fault injection. The code protections are not a substitute for an operating-system-level isolation boundary.
- Receive explicit human approval before any `v2.0.1` → `main` merge, release tag or npm publication.

Follow [issue #15](https://github.com/alifakbxr/a2a/issues/15) for independent acceptance and [v2.0.1 traceability](./V2_0_1_TRACEABILITY.md) for merge policy.

**Guarantees intentionally not made:** zero remaining vulnerabilities; complete runtime dependency or test coverage; independently verified semantic/browser executions; measured token savings; production certification.
