# Context-aware verification guidance (issue #10)

A2A's existing `a2a_verify(operation="plan")` response now contains `risk_guidance`. This is a **non-blocking, framework-neutral checklist** triggered by relevant changed paths and acceptance criteria. It covers tenant authorization, server-side financial integrity, inventory concurrency and offline queue recovery.

Every recommendation remains `not-run` until independently tested. Keyword matches are heuristics: suggestions do not prove vulnerabilities, and no match does **not** prove security. Existing evidence gates, workspace trust, and native Antigravity permissions remain unchanged.

Research motivation: Google DeepMind's agent workflow work emphasizes correct tool use and independent validation, rather than accepting a model's prose claims. See https://deepmind.google/blog/agentic-cheminformatics-with-google-antigravity/ and the original STOCKROOM audit.
