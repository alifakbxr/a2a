# Primary sources (reviewed 16 November 2026)

- Google Antigravity, Build Plugins: https://antigravity.google/docs/build-plugins/
- Google Antigravity, MCP: https://antigravity.google/docs/mcp/
- Google Antigravity, Hooks: https://antigravity.google/docs/hooks
- Google Antigravity, IDE Browser: https://antigravity.google/docs/ide/browser/
- Google Antigravity, Permissions: https://antigravity.google/docs/permissions/
- Google SRE, Effective Troubleshooting: https://sre.google/sre-book/effective-troubleshooting/
- Lauren Tan, pstack: https://github.com/cursor/plugins/tree/main/pstack

Source-derived decisions: the plugin manifest fields and `mcp_config.json` name, `${PLUGIN_ROOT}`/`PLUGIN_DATA`, `agy plugin validate`, Node-based local stdio MCP, and lazy-loaded tool definitions. A2A's graph algorithm, security controls, data schema and evidence model are **original design decisions**, not features claimed to be natively provided by Google.

**Provenance note:** This list records external research sources reviewed at the date in the heading; links, API terms, release availability and entitlement rules may change. It does **not** mean external code, plugins, agents or MCP servers were installed. The source of truth for current A2A behavior is [the local executable contract](CONTRACTS.md), the [architecture](ARCHITECTURE.md) and [CI evidence](https://github.com/alifakbxr/a2a/actions/runs/44325007116). External Antigravity integration remains unverified for this candidate.
