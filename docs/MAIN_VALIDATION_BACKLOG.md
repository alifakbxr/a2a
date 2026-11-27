# PILAH — independent validation backlog

**Updated 27 November 2026 for source v1.1.1.** This page records evidence that **cannot** be substituted by a green CI build, issue closure, assistant interpretation, or a locally generated report. Historical issue closures were often **deferred/superseded**, not independent acceptance.

## What source tests establish

- The local implementation compiles and is covered by automated Node tests, security regressions and MCP stdio contract checks.
- Routine `main` CI exercises Ubuntu, macOS and Windows on Node 24 (3/3 jobs); a full 9-job cross-platform/Node matrix is separately dispatchable.
- The read-only headless audit and A/B evaluator classify blocked or incomplete captures without claiming work was completed.
- Historical stockroom PHP syntax checks are **not** HTTP/DB/browser acceptance.

## Remaining independent checks

| ID | Required verification | Current state |
| --- | --- | --- |
| H01–H06 | Install exact PILAH candidate in a real Antigravity IDE/CLI, validate tool discovery/selection, denied workspaces, zero-call control, parent/subagent traces and restart behavior | **Not independently verified** |
| F01–F18 | Independently controlled real HTTP/DB/browser scenarios including negative permissions, ledger correctness, retries, concurrency and stale-build controls | **Not independently verified** |
| A/B | At least five counterbalanced matched Native/PILAH trials per variant, same snapshot/model/effort/permissions, provider-reported token usage and independently accepted outcomes | **No comparable pair established** |
| Security/privacy | Independently review stored artifacts, source provenance, workspace boundaries and exposed secrets | **Not independently approved** |
| Package publication | Sign exact commit and evidence manifest with independent authority; verify approved registry artifacts after guarded workflows run | **NO-GO** |

See [host validation](HOST_VALIDATION.md), [headless auditing](HEADLESS_CAPTURE_AUDIT.md), [release authorization](RELEASE_AUTHORIZATION.md) and [release process](RELEASE.md).

## Benchmark evidence boundary

The 27 November headless pilot is a **historical failure-case record**, not a token-savings experiment:

- #01: terminal model errors with no usable output.
- #02: both variants reported SUCCESS but command permissions were denied.
- #03: Native returned a response (118,792 total reported tokens); PILAH returned an empty response with denied MCP action and error step (59,332 reported tokens).
- #04: Native reached quota at 65,550 reported tokens; no matched PILAH capture.
- An IDE smoke test did observe targeted PILAH MCP use, but this was outside the matched CLI benchmark.

The accepted-task evaluator intentionally reports `null` for an unverified completed-task median. Historical quota screenshots, internal token estimates and incomplete tool calls cannot be counted as efficiency gains.

## Release checklist

- [ ] Run source `npm run check`, `node scripts/check-release.mjs` and package hygiene on the exact release commit.
- [ ] Complete the full 9-job Node/OS matrix for the release candidate.
- [ ] Capture real installed-host H01–H06 acceptance with source/permission attestation.
- [ ] Complete independently signed F01–F18 and privacy review.
- [ ] Obtain accepted Native/PILAH A/B results or explicitly report savings as not measured.
- [ ] Obtain detached approval bound to the exact approved release commit and registry digest.
- [ ] Publish through gated workflows and independently verify registry versions.

Nothing in this checklist is automatically satisfied by bumping the version to 1.1.1. `main` CI is a necessary source-quality check, not an independent external release certificate.
