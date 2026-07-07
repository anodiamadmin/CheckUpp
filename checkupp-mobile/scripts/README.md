# Scripts

## EAS Workflows

Workflow files live in `.eas/workflows`, next to `eas.json`.

### Development builds

Builds Android and iOS development clients in EAS.

```bash
yarn workflow:development
```

This runs `.eas/workflows/create-development-builds.yml` and uses the `development` build profile for both platforms.

### Production release

Builds Android and iOS production binaries, then submits only the iOS build to App Store Connect. Android is build-only so the Play Store upload can stay manual.

```bash
yarn workflow:production
```

This runs `.eas/workflows/deploy-to-production.yml` and uses the `production` build and submit profiles.

## `build-android.sh`

Builds the Android app for production only. It does not submit to Google Play.

**How it works**

- Runs `eas build --platform android --profile production`.
- Waits for the EAS build to finish.
- Leaves the finished build in EAS for manual download/upload.

**Usage**

```bash
yarn build:android
# or
./scripts/build-android.sh
```

Requires Android build credentials to be configured in EAS. You already have a production keystore assigned, so this should work without the Google Play service account.

## `build-and-submit-ios.sh`

Builds the iOS app for production and submits the **same** build to App Store Connect. Use this to avoid "build number already used" errors.

**How it works**

- Runs `eas build --platform ios --profile production` and waits for it to finish.
- Gets the build that just completed and runs `eas submit` with that build ID.
- Because you always submit the build you just made, you never resubmit an old build or reuse a build number.

**Version and build number**

- **Version** (`expo.version` in `app.json`): Bump manually when you want a new app version (e.g. 1.0.5 → 1.0.6).
- **Build number**: Managed by EAS via `autoIncrement: true` and `appVersionSource: "remote"` in `eas.json`. Do not set `ios.buildNumber` in `app.json` unless you have a specific reason.

**Usage**

```bash
yarn build-and-submit:ios
# or
./scripts/build-and-submit-ios.sh
```

Requires non-interactive EAS (e.g. `ascAppId` set in `eas.json` submit profile).

## `build-and-submit-android.sh`

Builds the Android app for production and submits the same build to Google Play.

**How it works**

- Runs `eas build --platform android --profile production` and waits for it to finish.
- Gets the Android build that just completed and runs `eas submit` with that build ID.
- Uses the `production` submit profile in `eas.json`.

**Version and version code**

- **Version** (`expo.version` in `app.json`): Bump manually when you want a new app version.
- **Version code**: Managed by EAS via `autoIncrement: true` and `appVersionSource: "remote"` in `eas.json`. Do not set `android.versionCode` in `app.json` unless you have a specific reason.

**Usage**

```bash
yarn build-and-submit:android
# or
./scripts/build-and-submit-android.sh
```

Requires Google Play submission setup:

- Google Play app exists with package `com.app.healthpassport`.
- At least one Android build has been uploaded manually to Google Play first.
- Google Play service account key is configured for EAS Submit.
- `eas.json` has `submit.production.android.track`, currently `internal`.

## `submit-latest-ios.sh`

Submits the **latest finished** iOS build to App Store Connect without creating a new build. Use this when you already have a completed build in EAS that you want to submit.

**How it works**

- Calls `eas build:list` for iOS and grabs the most recent build ID.
- Confirms the build status is `FINISHED`.
- Runs `eas submit` with that build ID using the `production` submit profile.

**Usage**

```bash
yarn submit-latest:ios
# or
./scripts/submit-latest-ios.sh
```

Requires non-interactive EAS (e.g. `ascAppId` set in `eas.json` submit profile).
