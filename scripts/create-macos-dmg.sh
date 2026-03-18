#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-$ROOT_DIR/build/macos/developer-id/Ownly.app}"
DMG_DIR="${DMG_DIR:-$ROOT_DIR/build/macos/dmg}"
DMG_NAME="${DMG_NAME:-Ownly-macOS}"
STAGING_DIR="$DMG_DIR/staging"
DMG_PATH="$DMG_DIR/$DMG_NAME.dmg"

if [[ ! -d "$APP_BUNDLE_PATH" ]]; then
  echo "App bundle not found at $APP_BUNDLE_PATH"
  exit 1
fi

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR" "$DMG_DIR"
cp -R "$APP_BUNDLE_PATH" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"
rm -f "$DMG_PATH"

hdiutil create \
  -volname "Ownly" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

echo "Created DMG at $DMG_PATH"
