# PILAH — build and validation status

**27 November 2026 — source release hardening candidate.** Canonical repository: [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Source package and Antigravity manifest: **1.0.4**. Source version is not proof of registry publication. The previous GitHub Packages identifier is frozen and no longer republished automatically. npmjs uses `@aliip/pilah`; GitHub Packages uses `@alifakbxr/pilah`. They are different registries and scopes. MCP stdio protocol handshake updated to support Antigravity's `2024-11-05`, `2024-10-07`, and `2025-03-26`. Documentation streamlined down to 13 essential documents, translated to full English, with quick install options via npm and CLI added.

| Check | Verified evidence | Still unknown |
| --- | --- | --- |
| Node source CI | **3/3** OS jobs passed on [main at cffffb8](https://github.com/alifakbxr/pilah/actions/runs/45374933008) | New security/host hardening commit still requires its own CI |
| npmjs 1.0.3 | [npmjs workflow](https://github.com/alifakbxr/pilah/actions/runs/45375423126) failed with registry `EOTP` (one-time password required) | Confirm npm Trusted Publisher and scope authorization, then signed release acceptance |
| GitHub Packages 1.0.3 | [Workflow](https://github.com/alifakbxr/pilah/actions/runs/45374986597) reported success while release evidence was conditionally skipped | Independently verify the published version; do not treat it as an authorized release |
| New workflow policy | Release authorization is mandatory and absent evidence must fail; registry lookup distinguishes 404 from operational errors; no swallowed publish failure | Actual CI and authorized publication must be tested independently |
| Antigravity H01–H06 | Source preflight/runbook exists | Actual installed-host execution and tool-choice traces |
| Independent F01–F18 | Frozen acceptance plan exists | Real isolated browser/PHP/DB test results with independent signed proof |
| Native vs PILAH | A/B methodology exists | Matched trials and provider-reported tokens/cost per accepted task |

**Release remains NO-GO** until independently signed acceptance and actual runtime evidence are collected. Success of repository tests never implies host adoption, model savings, or payment/security acceptance.

Rebrand source is traceable to **PR #107**, and reduced CI to **PR #108**. See [release process](docs/RELEASE.md), [authorization](docs/RELEASE_AUTHORIZATION.md), and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).

## 27 November benchmark audit

The headless audit utility from PR #144 is merged, but the A/B evaluator's accepted-task denominator requires the independent regression checks in issue #145. The 27 November pilot includes permission-denied or quota-interrupted captures and **zero independently comparable Native/PILAH pairs**. Run token totals for blocked attempts must not be reported as savings. Source tests and GitHub CI never substitute for independent Antigravity, model/quota parity, or F01–F18 acceptance.
