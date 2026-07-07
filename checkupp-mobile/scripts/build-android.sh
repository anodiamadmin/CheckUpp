#!/usr/bin/env bash
# Build Android production only. Does not submit to Google Play.
# Uses EAS autoIncrement (eas.json) + appVersionSource: "remote" so versionCode
# is managed by EAS.

set -e
cd "$(dirname "$0")/.."

echo "Building Android (production)..."
eas build --platform android --profile production --non-interactive
echo "Done."
