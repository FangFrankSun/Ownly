import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  setPersistence,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

const configuredWebAppUrl = process.env.EXPO_PUBLIC_APP_URL ?? '';
const configuredAuthorizedDomains = (process.env.EXPO_PUBLIC_FIREBASE_AUTHORIZED_DOMAINS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

type FirebaseAuthWithReactNativePersistence = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

function createAuth() {
  if (!app) {
    return null;
  }

  if (Platform.OS === 'web') {
    const webAuth = getAuth(app);
    void setPersistence(webAuth, browserLocalPersistence).catch((error: unknown) => {
      console.error('Failed to enable Firebase auth persistence on web', error);
    });
    return webAuth;
  }

  try {
    const reactNativePersistence = (FirebaseAuth as FirebaseAuthWithReactNativePersistence).getReactNativePersistence;
    return initializeAuth(app, {
      persistence: reactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth: Auth | null = createAuth();
export const db: Firestore | null = app ? getFirestore(app) : null;

type WebFirebaseAuthSupport =
  | {
      isSupported: true;
      currentOrigin: string | null;
    }
  | {
      isSupported: false;
      currentOrigin: string | null;
      message: string;
      suggestedUrl?: string;
      shouldRedirectToSuggestedUrl?: boolean;
    };

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function isLocalhostHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function isLoopbackIpHost(hostname: string) {
  return hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function isPrivateIpv4Host(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function buildSuggestedUrl(targetOrigin: string, currentUrl: URL) {
  const suggestedUrl = new URL(targetOrigin);
  suggestedUrl.pathname = currentUrl.pathname;
  suggestedUrl.search = currentUrl.search;
  suggestedUrl.hash = currentUrl.hash;
  return suggestedUrl.toString();
}

export function getWebFirebaseAuthSupport(): WebFirebaseAuthSupport {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { isSupported: true, currentOrigin: null };
  }

  const currentUrl = new URL(window.location.href);
  const currentOrigin = currentUrl.origin;
  const currentHost = currentUrl.hostname.toLowerCase();

  // Localhost should always be allowed for local development flows.
  if (isLocalhostHost(currentHost)) {
    return { isSupported: true, currentOrigin };
  }

  if (configuredWebAppUrl) {
    try {
      const configuredUrl = new URL(configuredWebAppUrl);
      if (configuredUrl.origin !== currentOrigin) {
        const suggestedUrl = buildSuggestedUrl(configuredUrl.origin, currentUrl);
        return {
          isSupported: false,
          currentOrigin,
          message: `Web sign-in is configured for ${configuredUrl.origin}. Open this app there instead of ${currentOrigin}.`,
          suggestedUrl,
          shouldRedirectToSuggestedUrl: true,
        };
      }
    } catch {
      // Ignore malformed optional app URLs and fall back to the current origin checks.
    }
  }

  const allowedHosts = new Set([
    normalizeHost(firebaseConfig.authDomain),
    ...configuredAuthorizedDomains.map(normalizeHost),
  ]);

  if (allowedHosts.has(currentHost)) {
    return { isSupported: true, currentOrigin };
  }

  if (isLoopbackIpHost(currentHost)) {
    const suggestedUrl = buildSuggestedUrl(`${currentUrl.protocol}//localhost${currentUrl.port ? `:${currentUrl.port}` : ''}`, currentUrl);
    return {
      isSupported: false,
      currentOrigin,
      message: `Firebase treats ${currentHost} and localhost as different domains. Open the app at ${suggestedUrl}, or add ${currentHost} to Firebase Authentication > Settings > Authorized domains.`,
      suggestedUrl,
      shouldRedirectToSuggestedUrl: true,
    };
  }

  if (isPrivateIpv4Host(currentHost)) {
    const suggestedUrl = buildSuggestedUrl(`${currentUrl.protocol}//localhost${currentUrl.port ? `:${currentUrl.port}` : ''}`, currentUrl);
    return {
      isSupported: false,
      currentOrigin,
      message: `Firebase web sign-in cannot start from ${currentOrigin}. Open the app at ${suggestedUrl} instead, or add ${currentHost} to Firebase Authentication > Settings > Authorized domains.`,
      suggestedUrl,
      shouldRedirectToSuggestedUrl: true,
    };
  }

  // For real public domains, let Firebase/Auth enforce the final decision.
  // We only hard-block obviously problematic local dev origins here.
  return { isSupported: true, currentOrigin };
}
