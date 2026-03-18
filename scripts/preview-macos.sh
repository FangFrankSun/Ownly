#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-$ROOT_DIR/build/macos-preview/DerivedData}"
CONFIGURATION="${CONFIGURATION:-Debug}"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/${CONFIGURATION}-maccatalyst/Ownly.app"

mkdir -p "$DERIVED_DATA_PATH"

xcodebuild \
  -workspace "$ROOT_DIR/ios/Ownly.xcworkspace" \
  -scheme Ownly \
  -configuration "$CONFIGURATION" \
  -destination "platform=macOS,variant=Mac Catalyst" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  CODE_SIGNING_ALLOWED=NO \
  build

if [[ ! -d "$APP_PATH" ]]; then
  echo "Preview app was not produced at $APP_PATH"
  exit 1
fi

echo "Preview app ready at:"
echo "$APP_PATH"

if [[ "$CONFIGURATION" = "Debug" ]]; then
  echo
  echo "This is a development build."
  echo "If the Expo launcher opens, start Metro with:"
  echo "  npx expo start --dev-client --port 8081"
  echo "Then click http://localhost:8081 in the launcher."
fi

if [[ "${OPEN_APP:-1}" == "1" ]]; then
  open "$APP_PATH"
fi
