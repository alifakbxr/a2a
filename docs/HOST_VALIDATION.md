# Installed-host Skill validation

Repository tests validate source behavior only. They do not prove that a live Antigravity App, CLI or IDE registers the hook, loads a Skill or selects it for a task.

1. Keep PILAH in `on-demand`; verify no Skill hint is injected.
2. Enable `always-on` and restart Antigravity.
3. In an authorized workspace, test one high-confidence English task and one Indonesian task.
4. Repeat the same task in the same conversation; the same fingerprint must not be injected twice.
5. Change the task and verify the two-distinct-fingerprint per-conversation cap is respected.
6. Revoke workspace authorization and verify no Skill scan/injection occurs.
7. Repeat in App, CLI and IDE. Record host version, event, hook output and independently observed Skill activation.

A recommendation is not proof of activation. Do not mark activation or usage learning complete without a host-provided, independently observable Skill-use event. Never share prompts, secrets, Skill bodies or private paths in traces.
