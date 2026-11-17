---
name: a2a-compact
description: Control A2A Compact Mode (terse, high-density bullet output and code skeletonization). Trigger with /a2a-compact.
---

# A2A Compact Mode

When triggered via `/a2a-compact` (optionally with `on`, `off`, `toggle`, or `status`):
1. Run the matching command:
   ```bash
   node ~/.gemini/config/plugins/a2a/scripts/a2a.mjs compact toggle
   ```
   Or pass `on`, `off`, or `status` instead of `toggle` when the user specifies an explicit state.
2. Report the new compact status (`enabled` or `disabled`) to the user without personal names.
3. When Compact Mode is enabled:
   - Eliminate filler words and conversational pleasantries.
   - Output responses in concise, telegraphic bullet points.
   - Retain 100% of code, file paths, diffs, terminal commands, and errors.
   - Use `a2a_context` with `action="skeleton"` for comment-stripped code previews with measured token savings.
