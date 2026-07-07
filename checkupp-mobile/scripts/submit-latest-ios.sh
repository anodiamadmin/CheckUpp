#!/usr/bin/env bash
# Submit the latest finished iOS build to App Store Connect.
# Assumes EAS appVersionSource: "remote" and autoIncrement are configured,
# so this script only finds the most recent finished build and submits it.

set -e
cd "$(dirname "$0")/.."

echo "Finding latest iOS build..."
BUILD_ID=$(eas build:list --platform ios --limit 1 --non-interactive --json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BUILD_ID" ]; then
  echo "Error: Could not get latest build ID."
  exit 1
fi

echo "Checking build status for $BUILD_ID..."
STATUS=$(eas build:view "$BUILD_ID" --json 2>/dev/null | grep -o '"status": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "Build status: $STATUS"

if [ "$STATUS" != "FINISHED" ]; then
  echo "Error: Latest build status is '$STATUS', not FINISHED.'"
  exit 1
fi

echo "Submitting build $BUILD_ID to App Store Connect..."
eas submit --platform ios --profile production --id "$BUILD_ID" --non-interactive
echo "Done."

