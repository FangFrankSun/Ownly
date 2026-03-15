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
```

For TestFlight/EAS builds, set the same values in `eas.json` under `build.production.env`.

## 2) Firebase Auth Setup

In Firebase Console:

1. Go to `Authentication`.
2. Enable `Email/Password`.
3. Enable social providers you want (`Google`, `Apple`, `Microsoft`).
4. Add allowed auth domains (for web), e.g.:
   - `localhost`
   - your future production domain

Current app behavior:
- Web supports Firebase popup auth for Google/Apple/Microsoft.
- iOS development builds and the production iOS app support Google sign-in.
- Expo Go on iOS should use email/password; native Google OAuth needs a development build or production app.
- Android currently supports email/password auth.

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
