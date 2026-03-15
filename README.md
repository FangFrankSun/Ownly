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
- iOS development builds and the production iOS app support Apple, Google, and Facebook sign-in.
- iOS and Android development builds / production apps support Facebook and Microsoft sign-in after provider setup.
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
