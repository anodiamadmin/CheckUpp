#!/usr/bin/env bash
# Build iOS production and submit to App Store Connect.
# Uses EAS autoIncrement (eas.json) + appVersionSource: "remote" so build numbers
# are managed by EAS — no manual increment needed. This script always submits
# the build that was just created, so you never hit "build number already used".

set -e
cd "$(dirname "$0")/.."

echo "Building iOS (production)..."
eas build --platform ios --profile production --non-interactive

# Get the build we just completed (latest finished build)
BUILD_ID=$(eas build:list --platform ios --limit 1 --non-interactive --json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$BUILD_ID" ]; then
  echo "Error: Could not get latest build ID."
  exit 1
fi

# Confirm it's finished (we just waited for it, but double-check)
echo "Checking build status..."
STATUS=$(eas build:view "$BUILD_ID" --json 2>/dev/null | grep -o '"status": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "Build status: $STATUS"
if [ "$STATUS" != "FINISHED" ]; then
  echo "Error: Latest build status is '$STATUS', not FINISHED."
  exit 1
fi

echo "Submitting build $BUILD_ID to App Store Connect..."
eas submit --platform ios --profile production --id "$BUILD_ID" --non-interactive
echo "Done."
