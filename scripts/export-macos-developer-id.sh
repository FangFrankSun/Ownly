#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT_DIR/build/macos/Ownly.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-$ROOT_DIR/build/macos/developer-id}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-$ROOT_DIR/ios/ExportOptions/mac-developer-id.plist}"
TEAM_ID="${TEAM_ID:-${DEVELOPMENT_TEAM:-}}"

mkdir -p "$EXPORT_PATH"

EXTRA_ARGS=()
if [[ "${ALLOW_PROVISIONING_UPDATES:-0}" == "1" ]]; then
  EXTRA_ARGS+=("-allowProvisioningUpdates")
fi
if [[ -n "$TEAM_ID" ]]; then
  EXTRA_ARGS+=("DEVELOPMENT_TEAM=$TEAM_ID")
fi
if [[ -n "${XCODEBUILD_EXTRA_ARGS:-}" ]]; then
  EXTRA_ARGS+=(${=XCODEBUILD_EXTRA_ARGS})
fi

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  "${EXTRA_ARGS[@]}"
