---
name: a2a-on-demand
description: Switch A2A to On-Demand mode (only active when explicitly called). Trigger with /a2a-on-demand.
---

# A2A On-Demand Mode

When triggered via `/a2a-on-demand` or when the user asks to enable On-Demand:
1. Run the command:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs mode on-demand
   ```
2. Confirm to the user that A2A is now in **`on-demand`** mode.
