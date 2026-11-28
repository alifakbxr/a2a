# Installed-host Skill validation

Repository tests validate source behavior only. They do not prove that a live Antigravity App, CLI or IDE registers the hook, loads a Skill or selects it for a task.

1. Keep PILAH in `on-demand`; verify no Skill hint is injected.
2. Enable `always-on` and restart Antigravity.
3. In an authorized workspace, test one high-confidence English task and one Indonesian task.
4. Repeat the same task in the same conversation; the same fingerprint must not be injected twice.
5. Change the task and verify the two-distinct-fingerprint per-conversation cap is respected.
6. In the same authorized workspace, let Antigravity read a complete `SKILL.md`; verify the workspace-scoped usage count increases. A ranged read, ordinary file, failed read, or `IsSkillFile: false` event must not increase it.
7. Switch to `on-demand`; verify no new usage is recorded. Re-enable `always-on`, revoke workspace authorization, and verify no new usage or recommendation is recorded.
8. Repeat in App, CLI and IDE. Record host version, event name, whether `view_file` supplied `IsSkillFile`, hook result, and the before/after usage count. Do not include prompts, Skill bodies, credentials, or absolute paths.

A recommendation is not proof of activation. A successful, un-ranged `view_file` event for a validated `SKILL.md` proves only that the host completed a full-file read; it does not prove task quality or that the instructions were followed. If a host surface does not emit the documented event shape, leave that surface unverified rather than inferring usage.
