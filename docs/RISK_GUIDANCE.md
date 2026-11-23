# Context-aware verification guidance (issue #10)

A2A's existing `a2a_verify(operation="plan")` response now contains `risk_guidance`. This is a **non-blocking, framework-neutral checklist** triggered by relevant changed paths and acceptance criteria. It covers tenant authorization, server-side financial integrity, inventory concurrency and offline queue recovery.

Every recommendation remains `not-run` until independently tested. Keyword matches are heuristics: suggestions do not prove vulnerabilities, and no match does **not** prove security. Existing evidence gates, workspace trust, and native Antigravity permissions remain unchanged.

Research motivation: Google DeepMind's agent workflow work emphasizes correct tool use and independent validation, rather than accepting a model's prose claims. See https://deepmind.google/blog/agentic-cheminformatics-with-google-antigravity/ and the original STOCKROOM audit.

**Pre-vNext additions:** Domain-specific, unexecuted negative tests now include server-authoritative price and payment reconciliation; duplicate refund lines and monetary-only refunds; last-stock and transfer concurrency; idempotency conflicting payload; authorization across routes, services, offline sync and background handlers; tenant/store relational ownership; browser account/cache isolation; demo credentials, invitation and rate limiting; UI accessibility. Risk plans are `status:not-run` and `coverage_assurance:none`, **never** a finding of an exploitable vulnerability or a release pass. `routes/web.php` and `PosController.php` now trigger specific high-risk templates.

## Structured negative controls and completion (PR #36)

When a high-risk user request is specific, prefer a **typed** `a2a_verify` plan: `id`, `given`, `when`, `then`, `evidence_type`, `negative` and any required UI state/viewport/reference. A domain heuristic only **suggests** relevant scenarios; it cannot claim that any route, refund, concurrency edge or UI interaction was tested. Plans report `completion.fully_verified:false`; after native tests, assess exact named assertions and report remaining **not_tested/blocked/stale** cases. See [contracts](CONTRACTS.md) and [behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md).

## Risk suggestions are advisory, never mandatory by regex

`proposeRiskTests` matches static path/criterion patterns, not proven vulnerabilities. Its historical `required_test_ids` field is now empty; use `suggested_test_ids` plus `suggested_total`, `suggested_visible`, and `more_available` for preview. In default Compact mode it ranks up to three candidate tests by task wording and returns counts for omitted scenarios **without hiding critical domain matches**; explicit Compact-off expands the full list. The agent/user must adopt and bind relevant tests using `a2a_verify(plan,persist_plan:true)` before they become required. A suggested negative control, even if relevant to a 5 Whys hypothesis, has status `not-run` until actual testing. [Adaptive RCA protocol](ADAPTIVE_RCA_WORKFLOW.md).

