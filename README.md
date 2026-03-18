# Ownly (Expo + Firebase)

This app now uses Firebase for auth + cloud data sync.

## 1) Environment Variables

Set these in `.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_APP_ID=...
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=...
EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
```

For TestFlight/EAS builds, set the same values in `eas.json` or your EAS environment under `build.production.env`.

## 2) Firebase Auth Setup

In Firebase Console:

1. Go to `Authentication`.
2. Enable `Email/Password`.
3. Enable social providers you want (`Google`, `Facebook`, `Apple`, `Microsoft`).
4. Add allowed auth domains (for web), e.g.:
   - `localhost`
   - your future production domain

Current app behavior:
- Web supports Firebase popup auth for Google/Facebook/Apple/Microsoft.
- iOS development builds and the production iOS app support Apple and Google sign-in.
- Android development builds and the production Android app support Google sign-in when `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is configured.
- Android does not support Apple sign-in in the current Expo native auth path.
- Expo Go on iOS/Android should use email/password; native OAuth redirects need a development build or production app.

## 3) Firestore Database Setup

In Firebase Console:

1. Go to `Firestore Database`.
2. Create database in **Native mode**.
3. Open `Rules` and apply rules from:
   - `firebase/firestore.rules`

The app data model is:

- `users/{uid}`
- `users/{uid}/task_categories/{categoryId}`
- `users/{uid}/tasks/{taskId}`

## 4) Optional: Deploy Rules via CLI

```bash
npm i -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

Rules and indexes sources:

- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `firebase.json`

## 5) Run App

```bash
npm install
npx expo start -c --port 8081
```

For native iOS Google sign-in during development, use a development build instead of Expo Go.

For native Facebook sign-in, set `EXPO_PUBLIC_FACEBOOK_APP_ID` before building so `app.config.ts` can register the `fb<App ID>` callback scheme on iOS/Android.

## 6) macOS Plan (DMG + Mac App Store)

Ownly now has an initial **Mac Catalyst** setup so the iOS app can be packaged as a macOS app with the same React Native / Expo feature set:

- email/password auth
- Firebase-synced tasks/categories
- dashboard / calendar / wellness / settings flows
- Apple Sign In entitlement
- location entitlement for dashboard weather

### Packaging targets

- **DMG / direct download**: signed with **Developer ID**
- **Mac App Store**: exported for **App Store Connect**

### Architecture

The goal is **one universal macOS build** rather than separate Intel and Apple Silicon apps. In practice, that means archiving a Mac Catalyst build that includes both `arm64` and `x86_64` when the native dependencies support both.

### Local build commands

Install/update pods after native changes:

```bash
npm run ios:pods
```

Preview the macOS app locally without signing:

```bash
npm run macos:preview
```

Archive the Mac Catalyst app:

```bash
npm run macos:archive
```

Export a Mac App Store package:

```bash
npm run macos:export:appstore
```

Export a Developer ID build for direct distribution:

```bash
npm run macos:export:developer-id
```

Create a DMG from the Developer ID export:

```bash
npm run macos:dmg
```

### Important release notes

- `ALLOW_PROVISIONING_UPDATES=1` can be prefixed to the macOS scripts if Xcode needs to refresh signing assets.
- If Xcode says **"Signing for Ownly requires a development team"**, pass your Apple team ID:

```bash
TEAM_ID=YOUR_APPLE_TEAM_ID ALLOW_PROVISIONING_UPDATES=1 npm run macos:archive
TEAM_ID=YOUR_APPLE_TEAM_ID npm run macos:export:developer-id
TEAM_ID=YOUR_APPLE_TEAM_ID npm run macos:export:appstore
```

- If Mac App Store export fails with **`contains invalid products`**, the archive is usually still signed with a **development** Mac Catalyst provisioning profile. For Ownly, the exact blocker was:
  - automatic signing archived with **Apple Development**
  - Xcode only had a **Mac Catalyst Team Provisioning Profile**
  - the app needs a **Mac App Store / distribution provisioning profile** that includes **Sign in with Apple**

- To fix that, create/download the missing Mac Catalyst App Store profile in Apple Developer, then archive with **manual** Release signing:

```bash
TEAM_ID=YOUR_APPLE_TEAM_ID \
ALLOW_PROVISIONING_UPDATES=1 \
MACOS_SIGNING_STYLE=Manual \
MACOS_SIGNING_IDENTITY="Apple Distribution" \
MACOS_PROFILE_SPECIFIER="YOUR_MAC_APP_STORE_PROFILE_NAME" \
npm run macos:archive

TEAM_ID=YOUR_APPLE_TEAM_ID npm run macos:export:appstore
```

- The App Store provisioning profile must match:
  - bundle ID: `com.shphfranksun.ownly`
  - platform: **Mac Catalyst / macOS**
  - capability: **Sign in with Apple**

- The number shown in some Apple account screens is often an **account/member identifier**, not the Xcode signing **Development Team ID**. The real signing team ID is usually a **10-character** value and must match the team selected in Xcode.
- If `security find-identity -v -p codesigning` shows **0 valid identities**, signing/export cannot work yet because the required Apple signing certificates are not installed locally.
- `XCODEBUILD_EXTRA_ARGS="CODE_SIGNING_ALLOWED=NO"` can be used for unsigned local validation builds.
- For App Store release, you still need your Apple Developer signing setup in Xcode.
- For direct download DMG, you should also notarize the exported app/DMG before public release.
