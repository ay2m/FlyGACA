#!/bin/bash
set -euo pipefail

# ensure-firebase-plists.sh — guarantee every app target has a GoogleService-Info.plist
# before XcodeGen/xcodebuild run.
#
# apple/project.yml references Apps/<Target>/GoogleService-Info.plist as a bundled
# resource for every app. It is declared `optional: true`, but that only spares
# *project generation* — with the XcodeGen version in CI the file is still added to the
# resources build phase, so `xcodebuild` fails with "Build input file cannot be found"
# on a checkout where the real plists are absent (the default, until they are downloaded
# from the Firebase console per docs/RUNBOOK-ios-firebase.md).
#
# This script restores the documented guarantee ("unsigned local builds keep working on
# a checkout where they're absent"): for each target it writes a **placeholder** plist
# ONLY when a real one is missing. Real committed plists (added with `git add -f`, since
# the path is gitignored to keep placeholders out of git) are never overwritten. The
# placeholder is a well-formed, obviously-fake config — Firebase is not wired until the
# PlatformLive target (Phase 4), so the file is only a bundled resource today.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APPS_DIR="$PROJECT_ROOT/apple/Apps"

# target dir : bundle id
TARGETS=(
  "PPL:com.flygaca.ppl"
  "ELPT:com.flygaca.elpt"
  "AIP:com.flygaca.aip"
  "CPL:com.flygaca.cpl"
  "IR:com.flygaca.ir"
  "ATPL:com.flygaca.atpl"
)

created=0
for entry in "${TARGETS[@]}"; do
  target="${entry%%:*}"
  bundle_id="${entry##*:}"
  dir="$APPS_DIR/$target"
  plist="$dir/GoogleService-Info.plist"

  [ -d "$dir" ] || continue
  if [ -f "$plist" ]; then
    continue
  fi

  # A minimal, valid, clearly-placeholder GoogleService-Info.plist. The BUNDLE_ID is
  # real (per target); every other value is an obvious placeholder. Firebase features
  # are disabled so nothing here is mistaken for a live configuration.
  cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>BUNDLE_ID</key>
	<string>${bundle_id}</string>
	<key>PROJECT_ID</key>
	<string>flygaca-placeholder</string>
	<key>GOOGLE_APP_ID</key>
	<string>1:000000000000:ios:0000000000000000000000</string>
	<key>GCM_SENDER_ID</key>
	<string>000000000000</string>
	<key>API_KEY</key>
	<string>PLACEHOLDER_API_KEY_NOT_A_REAL_CREDENTIAL</string>
	<key>STORAGE_BUCKET</key>
	<string>flygaca-placeholder.appspot.com</string>
	<key>PLIST_VERSION</key>
	<string>1</string>
	<key>IS_ADS_ENABLED</key>
	<false/>
	<key>IS_ANALYTICS_ENABLED</key>
	<false/>
	<key>IS_APPINVITE_ENABLED</key>
	<false/>
	<key>IS_GCM_ENABLED</key>
	<false/>
	<key>IS_SIGNIN_ENABLED</key>
	<false/>
	<key>FG_PLACEHOLDER</key>
	<true/>
</dict>
</plist>
PLIST
  echo "  + placeholder GoogleService-Info.plist for $target ($bundle_id)"
  created=$((created + 1))
done

if [ "$created" -gt 0 ]; then
  echo "ensure-firebase-plists: wrote $created placeholder plist(s) (real configs, when present, are left untouched)."
else
  echo "ensure-firebase-plists: every target already has a GoogleService-Info.plist."
fi
