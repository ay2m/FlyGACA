#!/bin/bash
set -e

# iOS xcodebuild wrapper — orchestrates content generation, validation, and builds
# Usage:
#   xcodebuild-wrapper.sh <app|all|info> [debug|release] [scheme-override]
#   xcodebuild-wrapper.sh ppl debug      # Debug build for PPL
#   xcodebuild-wrapper.sh all release    # Release builds for all three apps
#   xcodebuild-wrapper.sh info           # Print environment info

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
APP="${1:-info}"
CONFIGURATION="${2:-debug}"
SCHEME_OVERRIDE="${3:-}"

# Supported apps (Wave 1: ppl/elpt/aip · Wave 2: cpl/ir/atpl)
APPS=("ppl" "elpt" "aip" "cpl" "ir" "atpl")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check Xcode
  if ! xcode-select -p &> /dev/null; then
    log_error "Xcode Command Line Tools not installed"
    echo "  Run: xcode-select --install"
    exit 1
  fi

  # Check xcodebuild
  if ! command -v xcodebuild &> /dev/null; then
    log_error "xcodebuild not found"
    exit 1
  fi

  # Check swift
  if ! command -v swift &> /dev/null; then
    log_error "swift not found"
    exit 1
  fi

  # Check Node.js for content generation
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    exit 1
  fi

  log_success "All prerequisites met"
}

# Print system info
print_info() {
  log_info "iOS Build Environment"
  echo "  Xcode: $(xcodebuild -version | head -n 1)"
  echo "  Swift: $(swift --version | head -n 1)"
  echo "  iOS Support: $(xcode-select -p)/Platforms/iPhoneOS.platform/Developer/SDKs"
  echo "  FlyGACA Apps: ppl, elpt, aip, cpl, ir, atpl"
  echo ""
  echo "Available commands:"
  echo "  npm run ios:generate               # Generate Xcode project (needs xcodegen)"
  echo "  npm run ios:icons                  # Regenerate the per-app App Store icons"
  echo "  npm run ios:build:ppl              # Debug build PPL app (also: elpt aip cpl ir atpl)"
  echo "  npm run ios:build:all              # Debug builds all six apps"
  echo "  npm run ios:build:release:ppl      # Release build PPL (unsigned archive)"
  echo "  npm run ios:test                   # Run Swift Package tests"
  echo "  npm run ios:test:watch             # Watch mode for tests"
  echo "  npm run ios:clean                  # Clean build artifacts"
  echo ""
  echo "Release env flags (CI): FG_BUILD_NUMBER, FG_SIGNED_RELEASE=1 (+APPLE_TEAM_ID),"
  echo "  FG_PROVISIONING_PROFILE, FG_UPLOAD_TESTFLIGHT=1 (+ASC API key env)"
}

# Generate content for an app
generate_content() {
  local app=$1
  log_info "Generating content for $app..."

  if [ ! -f "$PROJECT_ROOT/scripts/build-ios-content.mjs" ]; then
    log_error "Content generation script not found: $PROJECT_ROOT/scripts/build-ios-content.mjs"
    exit 1
  fi

  if ! node "$PROJECT_ROOT/scripts/build-ios-content.mjs" --app "$app"; then
    log_error "Content generation failed for $app"
    exit 1
  fi

  log_success "Content generated for $app"
}

# Generate the Xcode project from apple/project.yml via XcodeGen.
# The project is deliberately not in git — project.yml is the source of truth.
generate_project() {
  local project_yml="$PROJECT_ROOT/apple/project.yml"
  local xcode_project="$PROJECT_ROOT/apple/FlyGACA.xcodeproj"

  if [ -f "$project_yml" ] && command -v xcodegen &> /dev/null; then
    log_info "Generating Xcode project from project.yml..."
    if ! (cd "$PROJECT_ROOT/apple" && xcodegen generate); then
      log_error "xcodegen generate failed"
      exit 1
    fi
    log_success "Xcode project generated"
  elif [ -d "$xcode_project" ]; then
    log_warn "xcodegen not installed — using existing FlyGACA.xcodeproj as-is"
  else
    log_error "Xcode project not found and xcodegen is not installed"
    echo ""
    echo "To generate the project:"
    echo "  brew install xcodegen"
    echo "  npm run ios:generate"
    exit 1
  fi
}

# Export a signed .ipa from an xcarchive and optionally upload it to TestFlight.
# Requires FG_SIGNED_RELEASE=1 context: APPLE_TEAM_ID set, cert + profile installed.
export_ipa() {
  local app=$1
  local archive_path=$2
  local profile_name="${FG_PROVISIONING_PROFILE:-FlyGACA ${SCHEME} AppStore}"
  local export_dir="$PROJECT_ROOT/apple/.build/export/$SCHEME"
  local export_options="$PROJECT_ROOT/apple/.build/ExportOptions-${SCHEME}.plist"

  log_info "Exporting .ipa for $app..."

  cat > "$export_options" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>export</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>teamID</key>
	<string>${APPLE_TEAM_ID}</string>
	<key>uploadSymbols</key>
	<true/>
	<key>provisioningProfiles</key>
	<dict>
		<key>${BUNDLE_ID}</key>
		<string>${profile_name}</string>
	</dict>
</dict>
</plist>
PLIST

  if ! xcodebuild \
    -exportArchive \
    -archivePath "$archive_path" \
    -exportOptionsPlist "$export_options" \
    -exportPath "$export_dir"; then
    log_error "Export failed for $app"
    return 1
  fi

  local ipa_path
  ipa_path=$(find "$export_dir" -name '*.ipa' -print -quit)
  if [ -z "$ipa_path" ]; then
    log_error "Export succeeded but no .ipa found in $export_dir"
    return 1
  fi

  # Log the shipped build number for CI verification
  local app_plist="$archive_path/Products/Applications/${SCHEME}.app/Info.plist"
  if [ -f "$app_plist" ]; then
    echo "  CFBundleVersion: $(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$app_plist" 2>/dev/null || echo '?')"
  fi

  log_success "Exported $ipa_path"

  if [ "${FG_UPLOAD_TESTFLIGHT:-}" = "1" ]; then
    if [ -z "${APP_STORE_CONNECT_API_KEY_ID:-}" ] || [ -z "${APP_STORE_CONNECT_API_ISSUER_ID:-}" ]; then
      log_error "FG_UPLOAD_TESTFLIGHT=1 requires APP_STORE_CONNECT_API_KEY_ID and APP_STORE_CONNECT_API_ISSUER_ID"
      return 1
    fi
    # altool looks for the .p8 at ~/private_keys/AuthKey_<KEY_ID>.p8
    log_info "Uploading $app to TestFlight..."
    if ! xcrun altool --upload-app --type ios \
      -f "$ipa_path" \
      --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
      --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID"; then
      log_error "TestFlight upload failed for $app (the .ipa is kept at $ipa_path)"
      return 1
    fi
    log_success "Uploaded $app to TestFlight"
  fi
}

# Build an app via xcodebuild
build_app() {
  local app=$1
  local config=$2

  # Map app name to scheme and bundle ID
  case "$app" in
    ppl)
      SCHEME="PPL"
      BUNDLE_ID="com.flygaca.ppl"
      MODULE_ID="ppl-exam"
      ;;
    elpt)
      SCHEME="ELPT"
      BUNDLE_ID="com.flygaca.elpt"
      MODULE_ID="elp"
      ;;
    aip)
      SCHEME="AIP"
      BUNDLE_ID="com.flygaca.aip"
      MODULE_ID="aip"
      ;;
    cpl)
      SCHEME="CPL"
      BUNDLE_ID="com.flygaca.cpl"
      MODULE_ID="cpl"
      ;;
    ir)
      SCHEME="IR"
      BUNDLE_ID="com.flygaca.ir"
      MODULE_ID="ir"
      ;;
    atpl)
      SCHEME="ATPL"
      BUNDLE_ID="com.flygaca.atpl"
      MODULE_ID="atpl"
      ;;
    *)
      log_error "Unknown app: $app"
      return 1
      ;;
  esac

  # Use override scheme if provided
  if [ -n "$SCHEME_OVERRIDE" ]; then
    SCHEME="$SCHEME_OVERRIDE"
  fi

  # Normalize configuration
  if [ "$config" = "release" ] || [ "$config" = "Release" ]; then
    CONFIG_NAME="Release"
  else
    CONFIG_NAME="Debug"
  fi

  log_info "Building $app ($CONFIG_NAME)..."
  echo "  Scheme: $SCHEME"
  echo "  Config: $CONFIG_NAME"
  echo "  Bundle ID: $BUNDLE_ID"
  echo "  Module ID: $MODULE_ID"

  # Check if Xcode project exists (generate_project has already run)
  XCODE_PROJECT="$PROJECT_ROOT/apple/FlyGACA.xcodeproj"
  if [ ! -d "$XCODE_PROJECT" ]; then
    log_error "Xcode project not found at $XCODE_PROJECT"
    echo ""
    echo "To generate the project:"
    echo "  brew install xcodegen"
    echo "  npm run ios:generate"
    exit 1
  fi

  # Optional CI build number (TestFlight needs a monotonically increasing CFBundleVersion)
  local version_args=()
  if [ -n "${FG_BUILD_NUMBER:-}" ]; then
    version_args=(CURRENT_PROJECT_VERSION="$FG_BUILD_NUMBER")
    echo "  Build #: $FG_BUILD_NUMBER"
  fi

  # Run xcodebuild
  local build_start=$(date +%s)

  if [ "$CONFIG_NAME" = "Release" ]; then
    local archive_path="$PROJECT_ROOT/apple/.build/${SCHEME}-${CONFIG_NAME}.xcarchive"

    if [ "${FG_SIGNED_RELEASE:-}" = "1" ]; then
      # Signed archive for App Store / TestFlight distribution (manual signing).
      if [ -z "${APPLE_TEAM_ID:-}" ]; then
        log_error "FG_SIGNED_RELEASE=1 requires APPLE_TEAM_ID to be set"
        return 1
      fi
      local profile_name="${FG_PROVISIONING_PROFILE:-FlyGACA ${SCHEME} AppStore}"
      echo "  Signing: Apple Distribution / $profile_name (team $APPLE_TEAM_ID)"

      if ! xcodebuild \
        -project "$XCODE_PROJECT" \
        -scheme "$SCHEME" \
        -configuration "$CONFIG_NAME" \
        -archivePath "$archive_path" \
        -arch arm64 \
        -sdk iphoneos \
        CODE_SIGN_STYLE=Manual \
        DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
        CODE_SIGN_IDENTITY="Apple Distribution" \
        PROVISIONING_PROFILE_SPECIFIER="$profile_name" \
        "${version_args[@]}" \
        archive; then
        log_error "Signed archive failed for $app"
        return 1
      fi
    else
      # Unsigned archive — dSYM/artifact pipeline works with zero Apple credentials.
      if ! xcodebuild \
        -project "$XCODE_PROJECT" \
        -scheme "$SCHEME" \
        -configuration "$CONFIG_NAME" \
        -archivePath "$archive_path" \
        -arch arm64 \
        -sdk iphoneos \
        CODE_SIGNING_ALLOWED=NO \
        CODE_SIGNING_REQUIRED=NO \
        CODE_SIGN_IDENTITY="" \
        "${version_args[@]}" \
        archive; then
        log_error "Archive failed for $app"
        return 1
      fi
    fi

    # Extract dSYMs from archive for crash reporting
    local dsyms_dir="$PROJECT_ROOT/apple/.build/dSYMs"
    mkdir -p "$dsyms_dir"

    if [ -d "$archive_path/dSYMs" ]; then
      cp -r "$archive_path/dSYMs"/* "$dsyms_dir/" 2>/dev/null || true
      log_success "dSYMs extracted to $dsyms_dir"
    fi

    if [ "${FG_SIGNED_RELEASE:-}" = "1" ]; then
      export_ipa "$app" "$archive_path" || return 1
    fi
  else
    # Debug builds run unsigned so no Apple account is needed locally or in CI.
    if ! xcodebuild \
      -project "$XCODE_PROJECT" \
      -scheme "$SCHEME" \
      -configuration "$CONFIG_NAME" \
      -derivedDataPath "$PROJECT_ROOT/apple/.build" \
      -arch arm64 \
      -sdk iphoneos \
      CODE_SIGNING_ALLOWED=NO \
      CODE_SIGNING_REQUIRED=NO \
      CODE_SIGN_IDENTITY="" \
      build; then
      log_error "Build failed for $app"
      return 1
    fi
  fi

  local build_end=$(date +%s)
  local build_time=$((build_end - build_start))

  log_success "Build succeeded for $app (${build_time}s)"
}

# Main logic
main() {
  case "$APP" in
    info)
      print_info
      ;;
    all)
      check_prerequisites
      generate_project
      for app in "${APPS[@]}"; do
        generate_content "$app"
        build_app "$app" "$CONFIGURATION" || exit 1
      done
      log_success "All builds completed successfully"
      ;;
    ppl|elpt|aip|cpl|ir|atpl)
      check_prerequisites
      generate_project
      generate_content "$APP"
      build_app "$APP" "$CONFIGURATION" || exit 1
      ;;
    *)
      log_error "Unknown app: $APP"
      echo ""
      echo "Usage: $0 <app|all|info> [debug|release]"
      echo ""
      echo "Apps: ppl, elpt, aip, cpl, ir, atpl, all"
      echo "Config: debug (default), release"
      exit 1
      ;;
  esac
}

# Run main
main
