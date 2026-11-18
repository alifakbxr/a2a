# Context-aware verification guidance (issue #10)

A2A's existing `a2a_verify(operation="plan")` response now contains `risk_guidance`. This is a **non-blocking, framework-neutral checklist** triggered by relevant changed paths and acceptance criteria. It covers tenant authorization, server-side financial integrity, inventory concurrency and offline queue recovery.

Every recommendation remains `not-run` until independently tested. Keyword matches are heuristics: suggestions do not prove vulnerabilities, and no match does **not** prove security. Existing evidence gates, workspace trust, and native Antigravity permissions remain unchanged.

Research motivation: Google DeepMind's agent workflow work emphasizes correct tool use and independent validation, rather than accepting a model's prose claims. See https://deepmind.google/blog/agentic-cheminformatics-with-google-antigravity/ and the original STOCKROOM audit.

**Pre-vNext additions:** Domain-specific, unexecuted negative tests now include server-authoritative price and payment reconciliation; duplicate refund lines and monetary-only refunds; last-stock and transfer concurrency; idempotency conflicting payload; authorization across routes, services, offline sync and background handlers; tenant/store relational ownership; browser account/cache isolation; demo credentials, invitation and rate limiting; UI accessibility. Risk plans are `status:not-run` and `coverage_assurance:none`, **never** a finding of an exploitable vulnerability or a release pass. `routes/web.php` and `PosController.php` now trigger specific high-risk templates.
