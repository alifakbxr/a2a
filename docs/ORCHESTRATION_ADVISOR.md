# PILAH Native Teamwork Advisor — v2.0.1

`PILAH_context(action="orchestration")` is an **optional, nonexecuting** advisor. It can only recommend native Antigravity capabilities that are explicitly reported as available in the active environment. It does not launch a worker, grant permissions, alter a model or install third-party agent software.

## Supported task declaration

```json
{
  "workspace": "/authorized/project",
  "action": "orchestration",
  "task": {
    "tier": "pro",
    "available_commands": ["/swarm", "/teamwork", "@subagent"],
    "workstreams": ["API", "UI", "Independent tests"],
    "dependencies": "low",
    "file_ownership": "independent",
    "milestones": 3,
    "long_horizon": true
  }
}
```

`tier`, `available_commands`, `workstreams` and `file_ownership` are **declarations**, not automatically discovered entitlements. The recognized commands are `/swarm`, `/teamwork`, `/boost` and `@subagent`. Tier rules are conservative and platform availability may change.

## Recommendation conditions

| Situation | Recommendation |
| --- | --- |
| Missing/unknown native capability, ownership unknown/shared or high coupling | `single-agent` (parallel modes withheld) |
| 2+ workstreams, dependencies low, ownership explicitly independent, suitable declared native capability | May recommend `/swarm` or `@subagent` depending on reported tier |
| Multiple milestones and long horizon **plus** independent file ownership and low dependencies | May recommend `/teamwork` if declared available |
| Hard tightly coupled reasoning with confirmed supported paid mode | May recommend `/boost` for single-agent challenger reasoning, not a parallel worker launch |

Even when recommended, `user_approval_required:true`, `automatic_worker_launch:false`. Prevent file ownership conflicts, validate worker MCP permissions independently, and require a named handoff test via `PILAH_verify(operation="verify_handoff")`. Parallel execution can cost **more** time/tokens and does not inherently improve quality.

The code-level requirements were strengthened in behavioral issue #34, merged through PR #36. Live native capability availability and actual productivity benefits still need an independently controlled test. See [workflow](NATIVE_FIRST_WORKFLOW.md) and [A/B protocol](AB_EVALUATION.md).
