#!/usr/bin/env bash
# Build a signed Android App Bundle (AAB) for a Capacitor app.
# Usage (from repo root):
#   APP=user-web bash deploy/scripts/build-android-release.sh
set -euo pipefail

APP="${APP:-}"
if [ -z "$APP" ]; then
  echo "Set APP to one of: user-web, doctor-web, operations-web"
  exit 1
fi

case "$APP" in
  user-web|doctor-web|operations-web) ;;
  *)
    echo "Unknown APP: $APP"
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$ROOT/apps/$APP"
ANDROID_DIR="$APP_DIR/android"
GRADLE_FILE="$ANDROID_DIR/app/build.gradle"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "Missing Android project at $ANDROID_DIR"
  exit 1
fi

if [ -n "${ANDROID_VERSION_CODE:-}" ]; then
  sed -i.bak "s/versionCode [0-9]*/versionCode ${ANDROID_VERSION_CODE}/" "$GRADLE_FILE"
  rm -f "${GRADLE_FILE}.bak"
  echo "Set versionCode=${ANDROID_VERSION_CODE}"
fi

if [ -n "${ANDROID_VERSION_NAME:-}" ]; then
  sed -i.bak "s/versionName \"[^\"]*\"/versionName \"${ANDROID_VERSION_NAME}\"/" "$GRADLE_FILE"
  rm -f "${GRADLE_FILE}.bak"
  echo "Set versionName=${ANDROID_VERSION_NAME}"
fi

cd "$APP_DIR"
echo "==> Building web assets + Capacitor sync ($APP)..."
npm run build:mobile

cd "$ANDROID_DIR"
chmod +x ./gradlew

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ] && [ -z "${ANDROID_KEYSTORE_FILE:-}" ]; then
  export ANDROID_KEYSTORE_FILE="$ANDROID_DIR/release.keystore"
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$ANDROID_KEYSTORE_FILE"
fi

if [ -n "${ANDROID_KEYSTORE_FILE:-}" ]; then
  echo "==> Release signing enabled"
  ./gradlew bundleRelease --no-daemon
else
  echo "==> No keystore configured — building unsigned release bundle"
  ./gradlew bundleRelease --no-daemon
fi

echo "==> AAB: $ANDROID_DIR/app/build/outputs/bundle/release/"
