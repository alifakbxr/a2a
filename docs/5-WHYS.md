# 5 Whys Findings → Implementation Matrix

5 Whys are *causal hypotheses* until reproduced. Five is a questioning device, not proof of a single underlying cause.

| Scenario | Why 1 | Why 2 | Why 3 | Why 4 | Why 5 | Implemented mitigation |
| --- | --- | --- | --- | --- | --- | --- |
| Regression after small edit | behavior changed | related tests not run | impact not visible | relationships dispersed | no change→test map | bounded graph impact + candidate tests |
| Build passes but feature fails | outcome untested | compile used as proxy | no observable check | unclear contract | no evidence gate | named test case + evidence verdict |
| Prior bug recurs | bad state returns | guard missing | fix isolated | knowledge not enforced | incident detached from test | incident/evidence graph |
| Wrong API | invalid call | guessed symbol | version unknown | no local grounding | no definition check | source manifests and symbols, native compiler recommended |
| Long context confusion | dependency missed | many unrelated files | search too wide | no scoped retrieval | no source graph | focused indexed query |
| Incorrect root cause | first fix wrong | alternatives ignored | no experiment | no falsifying evidence | hypotheses implicit | hypothesis and experiment registry |
| Concurrent agent conflict | change breaks API | shared contract changed | file partition insufficient | cross-feature coupling | dependency not declared | impact hints only; native ownership remains |
| Browser test unavailable | session cannot start | environment unsupported | preflight missing | tool availability assumed | surface mismatch | capability/limit reporting and native tool-only strategy |
| False PASS | report trusted | test skipped | output misparsed | no checks on testcase | criterion not mapped | report count validation and named test binding |
| Stale memory | wrong relation | source evolved | no fingerprint | not revision bound | no invalidation | source snapshot binding |
| Stale evidence | old report used | file changed | hash not compared | status cached | mutable artifact trusted | report SHA-256 and revision checks |
| Prompt injection | source instructs agent | data treated as authority | trust boundary unclear | tools overly broad | no allowed scope | no execution tool, read-only graph, restricted paths |
| Plugin crashes | tool unavailable | runtime error | agent depends on plugin | no fallback | optional component made mandatory | native Antigravity unaffected; no hooks |
| Cross-project leak | wrong info returned | namespace reused | path identity weak | boundary not checked | storage mixed | canonical workspace-derived IDs and authorization |
| Test reports forged | false success | parser trusts summary | no testcase check | no independent mapping | test source unverified | testcase counts and explicit report trust limitation |

Each scenario should be evaluated via a failing baseline test, the proposed mitigation, and a repeat test. Do not claim broad model intelligence gains solely because isolated tool unit tests pass.

**Historical baseline:** This matrix predates the behavioral audit. For present acceptance, recovery and the v2.0.1 implementation of six behavioral issues, see [Behavioral Five Whys](BEHAVIORAL_5_WHYS_V2_0_1.md) and [contracts](CONTRACTS.md). No Five Whys hypothesis is automatically a proven root cause.
