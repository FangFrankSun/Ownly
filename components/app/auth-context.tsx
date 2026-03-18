import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { auth, db, getWebFirebaseAuthSupport, isFirebaseConfigured, waitForAuthReady } from './firebase-client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  themeId: string | null;
  languagePreference?: 'en' | 'zh' | null;
};

type OAuthProviderId = 'google' | 'facebook' | 'apple' | 'azure';
type OAuthTokenProviderId = 'google.com' | 'facebook.com' | 'apple.com' | 'microsoft.com';

type AuthSuccess = {
  ok: true;
  message?: string;
};

type AuthFailure = {
  ok: false;
  error: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  signIn: (email: string, password: string) => Promise<AuthSuccess | AuthFailure>;
  signInWithOAuthTokens: (
    providerId: OAuthTokenProviderId,
    idToken?: string,
    accessToken?: string,
    rawNonce?: string,
    displayName?: string
  ) => Promise<AuthSuccess | AuthFailure>;
  signInWithGoogleIdToken: (idToken?: string, accessToken?: string) => Promise<AuthSuccess | AuthFailure>;
  signInWithProvider: (provider: OAuthProviderId) => Promise<AuthSuccess | AuthFailure>;
  signUp: (name: string, email: string, password: string) => Promise<AuthSuccess | AuthFailure>;
  signOut: () => Promise<void>;
};

const microsoftTenantId = process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID?.trim() || 'common';

const AuthContext = createContext<AuthContextValue | null>(null);

function buildFallbackAuthUser(firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
}): AuthUser {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName?.trim() || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email ?? '',
    themeId: 'ocean',
    languagePreference: null,
  };
}

function mapFirebaseAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : '';
  const webAuthSupport = getWebFirebaseAuthSupport();

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup replaced the previous one. Continue with the newest window.';
    case 'auth/popup-blocked':
      return 'Popup was blocked. Allow popups and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Auth.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already linked to a different sign-in method.';
    case 'auth/invalid-continue-uri':
    case 'auth/unauthorized-domain':
    case 'auth/auth-domain-config-required':
      return webAuthSupport.isSupported
        ? 'Firebase web sign-in needs a valid auth domain and authorized web origin.'
        : webAuthSupport.message;
    case 'auth/missing-or-invalid-nonce':
      return 'Apple sign-in could not verify the request. Try again after rebuilding the iOS app.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}

function readFirebaseAuthErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
}

function ensureFirebaseConfigured(): AuthFailure | null {
  if (auth && db && isFirebaseConfigured) {
    return null;
  }

  return {
    ok: false,
    error:
      'Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, and EXPO_PUBLIC_FIREBASE_APP_ID.',
  };
}

async function syncSignedInUserProfile(firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
}) {
  await setDoc(
    doc(db!, 'users', firebaseUser.uid),
    {
      name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
      email: firebaseUser.email ?? '',
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

function syncSignedInUserProfileInBackground(firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
}) {
  void syncSignedInUserProfile(firebaseUser).catch((error) => {
    console.error('Failed to sync signed-in user profile', error);
  });
}

function buildOAuthCredential(
  providerId: OAuthTokenProviderId,
  idToken?: string,
  accessToken?: string,
  rawNonce?: string
) {
  if (providerId === 'google.com') {
    return GoogleAuthProvider.credential(idToken || null, accessToken);
  }

  if (providerId === 'facebook.com') {
    return FacebookAuthProvider.credential(accessToken || '');
  }

  const provider = new OAuthProvider(providerId);
  return provider.credential({
    idToken,
    accessToken,
    rawNonce,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const profileUnsubscribeRef = useRef<null | (() => void)>(null);

  const applySignedInUserState = (firebaseUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
  }) => {
    setUser(buildFallbackAuthUser(firebaseUser));
    setIsHydrated(true);
    syncSignedInUserProfileInBackground(firebaseUser);
  };

  useEffect(() => {
    const firebaseAuth = auth;
    const firestore = db;
    let hydrationFallback: ReturnType<typeof setTimeout> | null = null;

    if (!firebaseAuth || !firestore) {
      setIsHydrated(true);
      return;
    }

    hydrationFallback = setTimeout(() => {
      setIsHydrated(true);
    }, 2500);

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (hydrationFallback) {
        clearTimeout(hydrationFallback);
        hydrationFallback = null;
      }

      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setIsHydrated(true);
        return;
      }

      setUser(buildFallbackAuthUser(firebaseUser));
      setIsHydrated(true);

      const userRef = doc(firestore, 'users', firebaseUser.uid);

      profileUnsubscribeRef.current = onSnapshot(
        userRef,
        (snapshot) => {
          const profile = snapshot.data() as {
            name?: string;
            themeId?: string;
            email?: string;
            languagePreference?: 'en' | 'zh' | 'system' | 'es' | null;
          } | undefined;
          const displayName =
            profile?.name?.trim() ||
            firebaseUser.displayName?.trim() ||
            firebaseUser.email?.split('@')[0] ||
            'User';

          if (!snapshot.exists()) {
            void setDoc(
              userRef,
              {
                name: displayName,
                email: firebaseUser.email ?? '',
                themeId: 'ocean',
                languagePreference: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              { merge: true }
            ).catch((error) => {
              console.error('Failed to create initial Firebase user profile', error);
            });
          }

          setUser({
            id: firebaseUser.uid,
            name: displayName,
            email: firebaseUser.email ?? profile?.email ?? '',
            themeId: profile?.themeId ?? 'ocean',
            languagePreference: normalizeLanguagePreference(profile?.languagePreference),
          });
        },
        (error) => {
          console.error('Failed to observe Firebase user profile', error);
          setUser(buildFallbackAuthUser(firebaseUser));
        }
      );
    });

    return () => {
      if (hydrationFallback) {
        clearTimeout(hydrationFallback);
      }
      unsubscribeAuth();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const firebaseAuth = auth;

    if (Platform.OS !== 'web' || !firebaseAuth) {
      return;
    }

    void waitForAuthReady()
      .then(() => getRedirectResult(firebaseAuth))
      .then((redirectResult) => {
        if (redirectResult?.user) {
          applySignedInUserState(redirectResult.user);
          syncSignedInUserProfileInBackground(redirectResult.user);
        }
      })
      .catch((error) => {
        console.error('Failed to complete redirected Firebase sign-in', error);
      });
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Email and password are required.' };
    }

    try {
      await waitForAuthReady();
      const credential = await signInWithEmailAndPassword(auth!, normalizedEmail, normalizedPassword);
      applySignedInUserState(credential.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
    }
  };

  const signInWithOAuthTokens: AuthContextValue['signInWithOAuthTokens'] = async (
    providerId,
    idToken,
    accessToken,
    rawNonce,
    displayName
  ) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    const normalizedIdToken = idToken?.trim() ?? '';
    const normalizedAccessToken = accessToken?.trim() || undefined;
    const normalizedRawNonce = rawNonce?.trim() || undefined;
    const requiresIdToken = providerId !== 'facebook.com';

    if ((requiresIdToken && !normalizedIdToken) || (!requiresIdToken && !normalizedAccessToken)) {
      const providerName =
        providerId === 'google.com'
          ? 'Google'
          : providerId === 'facebook.com'
            ? 'Facebook'
            : providerId === 'apple.com'
              ? 'Apple'
              : 'Microsoft';
      return {
        ok: false,
        error: providerId === 'facebook.com'
          ? `${providerName} sign-in did not return an access token.`
          : `${providerName} sign-in did not return an ID token.`,
      };
    }

    try {
      await waitForAuthReady();
      const credential = buildOAuthCredential(providerId, normalizedIdToken, normalizedAccessToken, normalizedRawNonce);
      const result = await signInWithCredential(auth!, credential);

      const normalizedDisplayName = displayName?.trim();
      if (providerId === 'apple.com' && normalizedDisplayName && !result.user.displayName) {
        void updateProfile(result.user, { displayName: normalizedDisplayName }).catch((error) => {
          console.error('Failed to update Apple display name', error);
        });
      }

      applySignedInUserState(result.user);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
    }
  };

  const signInWithGoogleIdToken: AuthContextValue['signInWithGoogleIdToken'] = async (idToken, accessToken) =>
    signInWithOAuthTokens('google.com', idToken, accessToken);

  const signInWithProvider: AuthContextValue['signInWithProvider'] = async (provider) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    if (Platform.OS !== 'web') {
      return {
        ok: false,
        error: 'Google/Facebook/Apple/Microsoft login is enabled on web. Use the native social buttons on mobile.',
      };
    }

    const webAuthSupport = getWebFirebaseAuthSupport();
    if (!webAuthSupport.isSupported) {
      if (webAuthSupport.shouldRedirectToSuggestedUrl && webAuthSupport.suggestedUrl && typeof window !== 'undefined') {
        window.location.assign(webAuthSupport.suggestedUrl);
        return {
          ok: true,
          message: `Redirecting to ${webAuthSupport.suggestedUrl} so Firebase web sign-in can continue.`,
        };
      }

      return {
        ok: false,
        error: webAuthSupport.message,
      };
    }

    const currentOrigin = webAuthSupport.currentOrigin ?? '';
    const isLocalDevOrigin = /^(https?:\/\/)(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(currentOrigin);

    const providerInstance =
      provider === 'google'
        ? new GoogleAuthProvider()
        : provider === 'facebook'
          ? new FacebookAuthProvider()
        : provider === 'apple'
          ? new OAuthProvider('apple.com')
          : new OAuthProvider('microsoft.com');

    if (provider === 'google') {
      providerInstance.setCustomParameters({
        prompt: 'select_account',
      });
    }

    if (provider === 'facebook') {
      providerInstance.addScope('email');
    }

    if (provider === 'apple') {
      providerInstance.addScope('email');
      providerInstance.addScope('name');
    }

    if (provider === 'azure') {
      providerInstance.setCustomParameters(
        microsoftTenantId && microsoftTenantId !== 'common'
          ? {
              prompt: 'select_account',
              tenant: microsoftTenantId,
            }
          : {
              prompt: 'select_account',
          }
      );
    }

    try {
      await waitForAuthReady();
      const popupResult = await signInWithPopup(auth!, providerInstance);
      applySignedInUserState(popupResult.user);
      return { ok: true };
    } catch (popupError) {
      const popupErrorCode = readFirebaseAuthErrorCode(popupError);
      const shouldFallbackToRedirect =
        popupErrorCode === 'auth/popup-blocked' ||
        popupErrorCode === 'auth/operation-not-supported-in-this-environment' ||
        popupErrorCode === 'auth/web-storage-unsupported';

      if (!shouldFallbackToRedirect) {
        return { ok: false, error: mapFirebaseAuthError(popupError) };
      }

      try {
        await signInWithRedirect(auth!, providerInstance);
        return {
          ok: true,
          message: isLocalDevOrigin
            ? 'Redirecting to continue sign-in on localhost...'
            : 'Redirecting to continue sign-in...',
        };
      } catch (redirectError) {
        return { ok: false, error: mapFirebaseAuthError(redirectError) };
      }
    }
  };

  const signUp: AuthContextValue['signUp'] = async (name, email, password) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Name, email, and password are required.' };
    }

    try {
      await waitForAuthReady();
      const credential = await createUserWithEmailAndPassword(auth!, normalizedEmail, normalizedPassword);
      applySignedInUserState(credential.user);

      void updateProfile(credential.user, { displayName: normalizedName }).catch((error) => {
        console.error('Failed to save display name after sign-up', error);
      });

      void setDoc(
        doc(db!, 'users', credential.user.uid),
        {
          name: normalizedName,
          email: normalizedEmail,
          themeId: 'ocean',
          languagePreference: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((error) => {
        console.error('Failed to create profile after sign-up', error);
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
    }
  };

  const signOut = async () => {
    if (!auth) {
      return;
    }

    await firebaseSignOut(auth);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isHydrated,
    signIn,
    signInWithOAuthTokens,
    signInWithGoogleIdToken,
    signInWithProvider,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
function normalizeLanguagePreference(value: unknown): AuthUser['languagePreference'] {
  return value === 'en' || value === 'zh' ? value : null;
}
