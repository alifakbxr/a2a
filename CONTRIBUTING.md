# Contributing to PILAH

Thank you for helping improve PILAH. Contributions to code, tests, documentation, accessibility, compatibility, and reproducible bug reports are welcome. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

Fork the repository, clone your fork, and create a focused branch from `main`. Use Node.js 22.13.0 or newer; Node 24 matches routine CI.

```sh
git clone https://github.com/YOUR_USERNAME/pilah.git
cd pilah
git switch -c fix/short-description
node --version
node scripts/pilah.mjs doctor
npm run check
node scripts/check-release.mjs
```

PILAH has no external runtime dependencies. Do not introduce dependencies or modify release workflows without a clear need and maintainer review.

## Engineering expectations

- Search existing [issues](https://github.com/alifakbxr/pilah/issues) first. Discuss substantial changes before implementation.
- Prefer native Antigravity capabilities, progressive disclosure, scoped analysis, and the smallest complete change.
- Preserve workspace trust, privacy, local-only analysis, compatibility, and evidence boundaries. Never bypass permission checks.
- Add focused regression tests for defects. Use temporary fixtures and synthetic credentials; avoid personal paths, logs, real secrets, or customer data.
- Update tool contracts and documentation when behavior changes. Keep documentation and public interfaces in English.
- Report exact commands and observed results. Mark unexecuted tests as not tested; source CI is not installed-host or browser acceptance.
- For performance claims, provide matched inputs, model/effort, environment, actual tool adoption, separate token counters, timings, and acceptance results. Do not equate quota percentages with token savings.
- AI-assisted contributions are welcome if the submitter reviews, understands, tests, and takes responsibility for the changes. Do not submit unverified bulk changes.

## Pull requests

Keep each PR focused, explain the problem and solution, link relevant issues, and include testing evidence and limitations. Run `npm run check` and `node scripts/check-release.mjs` for code changes; for documentation-only changes, review links, formatting and examples and state which checks were not run. Runtime-specific changes may require the full compatibility matrix. Installed IDE behavior needs the [host validation runbook](docs/HOST_VALIDATION.md).

Maintainers may request revisions or decline changes that conflict with project scope. Merging a PR does not authorize package publication; follow the [release process](docs/RELEASE.md).

Contributions are submitted under the existing [MIT license](LICENSE). Submit only material you have the right to contribute. For security issues, follow [SECURITY.md](SECURITY.md) rather than opening a public bug report.
