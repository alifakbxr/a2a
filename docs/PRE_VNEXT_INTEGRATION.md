# Pre-vNext Integration Candidate — INTERNAL CI ONLY

Source: main b622110d0feabf469390a41f3c93338053b3c7b6

Feature branches: PR #16 to #27 (all are still Draft).
All changed blobs come from the latest corresponding PR heads, except three
overlapping tool contracts manually reconciled into this branch:
- src/engine.mjs: #17 release assessment, #21 semantic/browser evidence, #24 orchestration
- src/tools.mjs: combined a2a_verify operations + orchestration context
- schemas/mcp-tools.json: corresponding generated MCP input contract

This is a temporary candidate for combined CI and manual assessment.
It is NOT the vNext benchmark branch, not published as an npm release,
and not evidence that STOCKROOM's real PHP/browser scenarios were independently executed.

Latest combined regression: https://github.com/alifakbxr/a2a/actions/runs/44239276797 (Node 22/24, Linux/macOS/Windows, tests and contract checks). The release gate now requires an external pinned acceptance registry. This does not attest actual browser or database execution.

Remaining gates:
- real external negative-control tests against running generated applications
- actual Antigravity plugin installation and live MCP/Browser smoke tests
- end-to-end token/provider usage and repeatable 4-arm benchmark
- human authorization before any PR is merged to main
