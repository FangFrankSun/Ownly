#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT_DIR/build/macos/Ownly.xcarchive}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-$ROOT_DIR/build/macos/DerivedData}"
TEAM_ID="${TEAM_ID:-${DEVELOPMENT_TEAM:-}}"
MACOS_SIGNING_STYLE="${MACOS_SIGNING_STYLE:-Automatic}"
MACOS_SIGNING_IDENTITY="${MACOS_SIGNING_IDENTITY:-}"
MACOS_PROFILE_SPECIFIER="${MACOS_PROFILE_SPECIFIER:-}"

mkdir -p "$(dirname "$ARCHIVE_PATH")" "$DERIVED_DATA_PATH"

EXTRA_ARGS=()
if [[ "${ALLOW_PROVISIONING_UPDATES:-0}" == "1" ]]; then
  EXTRA_ARGS+=("-allowProvisioningUpdates")
fi
if [[ -n "$TEAM_ID" ]]; then
  EXTRA_ARGS+=("DEVELOPMENT_TEAM=$TEAM_ID")
fi
if [[ -n "$MACOS_SIGNING_STYLE" ]]; then
  EXTRA_ARGS+=("CODE_SIGN_STYLE=$MACOS_SIGNING_STYLE")
fi
if [[ -n "$MACOS_SIGNING_IDENTITY" ]]; then
  EXTRA_ARGS+=("CODE_SIGN_IDENTITY=$MACOS_SIGNING_IDENTITY")
fi
if [[ -n "$MACOS_PROFILE_SPECIFIER" ]]; then
  EXTRA_ARGS+=("PROVISIONING_PROFILE_SPECIFIER=$MACOS_PROFILE_SPECIFIER")
fi
if [[ -n "${XCODEBUILD_EXTRA_ARGS:-}" ]]; then
  EXTRA_ARGS+=(${=XCODEBUILD_EXTRA_ARGS})
fi

xcodebuild \
  -workspace "$ROOT_DIR/ios/Ownly.xcworkspace" \
  -scheme Ownly \
  -configuration Release \
  -destination "generic/platform=macOS,variant=Mac Catalyst" \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  "${EXTRA_ARGS[@]}" \
  archive
