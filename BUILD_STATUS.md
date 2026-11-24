# PILAH — build and validation status

**24 November 2026 — source release hardening candidate.** Canonical repository: [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Source package and Antigravity manifest: **1.0.1**. The legacy GitHub Packages identifier `@alifakbxr/a2a@2.1.0` is frozen, not automatically republished. npmjs uses `@aliip/pilah`; GitHub Packages uses `@alifakbxr/pilah`. They are different registries and scopes.

| Check | Verified evidence | Still unknown |
| --- | --- | --- |
| Node source CI | [3 OS Node 24 run](https://github.com/alifakbxr/pilah/actions/runs/45334431086) passed on pre-hardening source | Latest hardening commit requires its own CI |
| Historical npm publication | [npmjs workflow](https://github.com/alifakbxr/pilah/actions/runs/45333440097) failed to publish 1.0.1 | Whether registry contains exact version; check `npm view @aliip/pilah@1.0.1 version` |
| Historical GitHub Packages publication | [Workflow](https://github.com/alifakbxr/pilah/actions/runs/45336737118) succeeded, but old workflow swallowed publish failures | Current registry package/version must be confirmed |
| New workflow policy | Release authorization is mandatory and absent evidence must fail; registry lookup distinguishes 404 from operational errors; no swallowed publish failure | Actual CI and authorized publication must be tested independently |
| Antigravity H01–H06 | Source preflight/runbook exists | Actual installed-host execution and tool-choice traces |
| Independent F01–F18 | Frozen acceptance plan exists | Real isolated browser/PHP/DB test results with independent signed proof |
| Native vs PILAH | A/B methodology exists | Matched trials and provider-reported tokens/cost per accepted task |

**Release remains NO-GO** until independently signed acceptance and actual runtime evidence are collected. Success of repository tests never implies host adoption, model savings, or payment/security acceptance.

See [release process](docs/RELEASE.md), [authorization](docs/RELEASE_AUTHORIZATION.md), and [validation backlog](docs/MAIN_VALIDATION_BACKLOG.md).
