# Security Policy

## Scope and supported versions

PILAH is actively developed on `main`. Security fixes are prioritized for the current maintained source and latest published release where applicable. Older versions are not guaranteed security updates. Check [releases](https://github.com/alifakbxr/pilah/releases), [build status](BUILD_STATUS.md), and the [release process](docs/RELEASE.md) before relying on a version; source availability is not proof of registry publication or security acceptance.

See the [security architecture and privacy boundaries](docs/SECURITY.md) for details on workspace authorization, local storage, evidence integrity, and residual risks.

## Reporting a vulnerability

Do not open public issues or pull requests containing vulnerability details, exploit code, private logs, credentials, or user data.

1. Visit [Security advisories](https://github.com/alifakbxr/pilah/security/advisories). If **Report a vulnerability** is available, submit a private report there.
2. If private vulnerability reporting is unavailable, request a private security contact through a minimal [GitHub issue](https://github.com/alifakbxr/pilah/issues/new) without disclosing vulnerability details, or use a private contact method published on the [maintainer's profile](https://github.com/alifakbxr).
3. Provide the affected version/commit, OS and runtime, minimal safe reproduction, impact, and suggested mitigation if known. Redact logs and use synthetic data.

Please coordinate disclosure with maintainers and allow reasonable time to investigate and remediate. Response times depend on maintainer availability; no guaranteed SLA is offered.

## Security research

Test only systems and workspaces you own or have explicit authorization to test. Avoid accessing other people's data, disrupting services, or modifying production environments. Rotate any exposed credentials immediately. For ordinary bugs and setup questions, see [SUPPORT.md](SUPPORT.md).
