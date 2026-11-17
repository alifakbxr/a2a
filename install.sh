#!/usr/bin/env bash
# A2A (Agent to Alif) Universal Installer for Google Antigravity
# Usage: curl -fsSL https://raw.githubusercontent.com/alifakbxr/a2a/main/install.sh | bash

set -e

# ANSI Color codes
CYAN='\033[0;36m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "    █████╗ ██████╗  █████╗ "
echo "   ██╔══██╗╚════██╗██╔══██╗"
echo "   ███████║ █████╔╝███████║"
echo "   ██╔══██║██╔═══╝ ██╔══██║"
echo "   ██║  ██║███████╗██║  ██║"
echo "   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BLUE}▶ Installing A2A (Agent to Alif) — Engineering Intelligence & Token Saver...${NC}\n"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}✖ Error: Node.js is required but not installed.${NC}"
  echo "Please install Node.js (>= 22.13.0) and rerun."
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo -e "${YELLOW}⚠ Warning: A2A requires Node.js >= 22.13.0 for native SQLite. Current: $(node -v)${NC}"
fi

# 2. Determine target plugins directory
TARGET_DIR="${HOME}/.gemini/config/plugins/a2a"
PARENT_DIR="${HOME}/.gemini/config/plugins"

mkdir -p "$PARENT_DIR"

# 3. Clone or Update
if [ -d "$TARGET_DIR/.git" ]; then
  echo -e "${CYAN}→ Existing installation found. Updating to latest...${NC}"
  git -C "$TARGET_DIR" pull --ff-only origin main || true
elif [ -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}→ Replacing existing directory with fresh clone...${NC}"
  rm -rf "$TARGET_DIR"
  git clone https://github.com/alifakbxr/a2a.git "$TARGET_DIR"
else
  echo -e "${CYAN}→ Cloning A2A into ${TARGET_DIR}...${NC}"
  git clone https://github.com/alifakbxr/a2a.git "$TARGET_DIR"
fi

# 4. Verify installation
if [ -f "$TARGET_DIR/plugin.json" ]; then
  echo -e "${GREEN}✔ Files installed successfully.${NC}"
else
  echo -e "${RED}✖ Installation failed: plugin.json not found.${NC}"
  exit 1
fi

# 5. Check Antigravity discovery
if command -v agy >/dev/null 2>&1; then
  echo -e "${CYAN}→ Verifying with Antigravity CLI...${NC}"
  if agy plugin list 2>/dev/null | grep -q "a2a"; then
    echo -e "${GREEN}✔ Discovered by Antigravity CLI!${NC}"
  fi
fi

# 6. Test Doctor
echo -e "${CYAN}→ Running A2A self-check...${NC}"
node "$TARGET_DIR/scripts/a2a.mjs" doctor >/dev/null 2>&1 && echo -e "${GREEN}✔ Self-check passed!${NC}" || true

echo -e "\n${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✔ A2A (Agent to Alif) is successfully installed!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "You can now use A2A in Antigravity chat:"
echo -e "  • ${CYAN}/a2a-compact${NC}     - Toggle token-saver mode (65-80% output savings)"
echo -e "  • ${CYAN}/a2a-toggle${NC}      - Toggle Always-On / On-Demand mode"
echo -e "  • ${CYAN}/a2a-status${NC}      - View active mode & health"
echo -e "  • ${CYAN}/a2a tokens${NC}      - Inspect project token footprint"
echo ""
