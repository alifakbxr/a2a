# PILAH — build and validation status

**As of 24 November 2026:** PILAH is on `main` with source manifest version `1.0.0`. The canonical repository remains `the existing repository` until a separate GitHub rename. `@aliip/pilah` is the package manifest name, **not confirmation of publication**.

| Area | Observable evidence | Boundary |
| --- | --- | --- |
| PILAH rebrand | PR #107, 9/9 matrix | Source-level Node 22/24/26.13.1 CI across three OS |
| Reduced CI and native routing | PR #108 | 1 full-suite job/PR, 3 on main, 9 manually available |
| Latest verified main source CI | Run #45313799636 | **3/3** Ubuntu/macOS/Windows Node 24 jobs passed at `9426397` |
| Engineering hardening | PRs #111–#115 | MCP contracts, directional graph, SAFE handoffs, consent-gated privacy, Python imports, and fail-closed CLI host preflight passed their PR suites; no live host proof |
| Installed Antigravity | [Backlog](docs/MAIN_VALIDATION_BACKLOG.md) | No complete independent live-host acceptance for PILAH |
| Context Guardian overhead | [Backlog](docs/MAIN_VALIDATION_BACKLOG.md) | Host per-invocation latency/CPU/token effect not measured |
| Token savings | [Validation backlog](docs/MAIN_VALIDATION_BACKLOG.md) | Not established through matched independent trials |
| Real Acceptance F01–F18 | [Independent runbook](docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md) | Runtime HTTP/DB/browser cases not established as PASS |
| npm / GitHub Package / tagged release | [Release authorization](docs/RELEASE_AUTHORIZATION.md) | **NO-GO** without signed external evidence and approval |

Green CI means the complete checked-in test suite and static release checks passed for the specified commit and runner—not actual browser, printing, database race, installed plugin, autonomous tool selection, or cost evidence. Keep missing acceptance marked **not tested**.

## Earlier PILAH provenance

The original `v2.0.1` integration was promoted to `main` through PR #105; PILAH branding followed in PR #107. Issues #15, #71, #91 and #92 were closed **administratively as deferred/superseded**, not completed evidence. Historical 213/213 tests and 4/4 OS/runtime jobs describe an older source snapshot, not the current version.

Check [documentation](docs/README.md), [CI lanes](docs/CI_EFFICIENCY.md), and [outstanding validation](docs/MAIN_VALIDATION_BACKLOG.md). Do not infer release authorization from a merge.
