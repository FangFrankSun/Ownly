#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT_DIR/build/macos/Ownly.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-$ROOT_DIR/build/macos/app-store}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-$ROOT_DIR/ios/ExportOptions/mac-app-store.plist}"
TEAM_ID="${TEAM_ID:-${DEVELOPMENT_TEAM:-}}"
PRODUCT_BUNDLE_IDENTIFIER="${PRODUCT_BUNDLE_IDENTIFIER:-com.shphfranksun.ownly}"
MACOS_PROFILE_SPECIFIER="${MACOS_PROFILE_SPECIFIER:-Ownly Mac Catalyst App Store}"
MACOS_SIGNING_CERTIFICATE="${MACOS_SIGNING_CERTIFICATE:-Apple Distribution}"
MACOS_INSTALLER_SIGNING_CERTIFICATE="${MACOS_INSTALLER_SIGNING_CERTIFICATE:-3rd Party Mac Developer Installer}"

mkdir -p "$EXPORT_PATH"

if [[ -n "$TEAM_ID" && -n "$MACOS_PROFILE_SPECIFIER" ]]; then
  GENERATED_EXPORT_OPTIONS_PLIST="$ROOT_DIR/build/macos/mac-app-store.generated.plist"
  cat > "$GENERATED_EXPORT_OPTIONS_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>destination</key>
    <string>export</string>
    <key>generateAppStoreInformation</key>
    <true/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
    <key>method</key>
    <string>app-store-connect</string>
    <key>installerSigningCertificate</key>
    <string>$MACOS_INSTALLER_SIGNING_CERTIFICATE</string>
    <key>provisioningProfiles</key>
    <dict>
      <key>$PRODUCT_BUNDLE_IDENTIFIER</key>
      <string>$MACOS_PROFILE_SPECIFIER</string>
    </dict>
    <key>signingCertificate</key>
    <string>$MACOS_SIGNING_CERTIFICATE</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>$TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
  </dict>
</plist>
PLIST
  EXPORT_OPTIONS_PLIST="$GENERATED_EXPORT_OPTIONS_PLIST"
fi

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
