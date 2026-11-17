---
name: a2a-status
description: Check A2A current operating mode, permissions, and doctor health status. Trigger with /a2a-status.
---

# A2A Status & Health Check

When triggered via `/a2a-status` or when the user asks for A2A status:
1. Run the command:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs doctor
   ```
2. Display the current mode (`always-on` or `on-demand`), data directory, and active Antigravity IDE workspaces.
