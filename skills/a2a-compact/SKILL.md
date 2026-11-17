---
name: a2a-compact
description: Toggle A2A Compact Mode (65-80% output token reduction, zero fluff, telegraphic high-density communication). Trigger with /a2a-compact.
---

# A2A Compact Mode (Token Saver)

When triggered via `/a2a-compact` or when the user asks to enable compact/terse mode:
1. Run the toggle command:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact toggle
   ```
2. Report the new status to the user.
3. When Compact Mode is enabled, follow the **A2A Compact Protocol**:
   - Eliminate filler words, conversational niceties, and pleasantries ("Sure!", "Here is...", "As requested...").
   - Output responses in telegraphic, high-density bullet points.
   - Retain 100% of code, file paths, diffs, terminal commands, and technical accuracy.
   - Slashes output token costs by 65% to 80%.
