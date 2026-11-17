---
name: a2a-toggle
description: Toggle A2A between Always-On and On-Demand modes immediately. Trigger with /a2a-toggle.
---

# A2A Mode Toggle

When triggered via `/a2a-toggle` or when the user asks to toggle A2A mode:
1. Run the toggle command:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs toggle
   ```
2. Report the new active mode back to the user clearly.
