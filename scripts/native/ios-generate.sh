#!/bin/bash
set -euo pipefail

# ios:generate — regenerate apple/FlyGACA.xcodeproj from apple/project.yml (XcodeGen).
#
# The Xcode project is generated, never committed (apple/project.yml is the source of
# truth; apple/FlyGACA.xcodeproj is gitignored). This wrapper makes
# `npm run ios:generate` work on a fresh Mac: if XcodeGen is missing it installs it
# (Homebrew, falling back to Mint), and prints clear guidance if neither is available —
# instead of failing with a bare "xcodegen: command not found".

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APPLE_DIR="$PROJECT_ROOT/apple"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1" >&2; }

if [ ! -f "$APPLE_DIR/project.yml" ]; then
  log_error "apple/project.yml not found — nothing to generate."
  exit 1
fi

# Ensure the `xcodegen` command is available, installing it when we can.
ensure_xcodegen() {
  if command -v xcodegen &> /dev/null; then
    return 0
  fi

  log_warn "XcodeGen is not installed — attempting to install it."

  if command -v brew &> /dev/null; then
    log_info "Installing XcodeGen with Homebrew…"
    if brew install xcodegen && command -v xcodegen &> /dev/null; then
      return 0
    fi
  fi

  if command -v mint &> /dev/null; then
    log_info "Installing XcodeGen with Mint…"
    if mint install yonaskolb/xcodegen && command -v xcodegen &> /dev/null; then
      return 0
    fi
  fi

  log_error "XcodeGen is required but could not be installed automatically."
  echo "  Install it with one of:" >&2
  echo "    brew install xcodegen" >&2
  echo "    mint install yonaskolb/xcodegen" >&2
  echo "  See https://github.com/yonaskolb/XcodeGen for other options." >&2
  return 1
}

ensure_xcodegen || exit 1

log_info "Generating apple/FlyGACA.xcodeproj from apple/project.yml…"
if (cd "$APPLE_DIR" && xcodegen generate); then
  log_success "Generated apple/FlyGACA.xcodeproj"
  echo "  Open it with: open apple/FlyGACA.xcodeproj"
else
  log_error "xcodegen generate failed"
  exit 1
fi
