import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { auth, db, getWebFirebaseAuthSupport, isFirebaseConfigured } from './firebase-client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  themeId: string | null;
};

type OAuthProviderId = 'google' | 'apple' | 'azure';

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
  signInWithGoogleIdToken: (idToken?: string, accessToken?: string) => Promise<AuthSuccess | AuthFailure>;
  signInWithProvider: (provider: OAuthProviderId) => Promise<AuthSuccess | AuthFailure>;
  signUp: (name: string, email: string, password: string) => Promise<AuthSuccess | AuthFailure>;
  signOut: () => Promise<void>;
};

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
    case 'auth/popup-blocked':
      return 'Popup was blocked. Allow popups and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Auth.';
    case 'auth/invalid-continue-uri':
    case 'auth/unauthorized-domain':
    case 'auth/auth-domain-config-required':
      return webAuthSupport.isSupported
        ? 'Firebase web sign-in needs a valid auth domain and authorized web origin.'
        : webAuthSupport.message;
    default:
      return message || 'Authentication failed. Please try again.';
  }
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const profileUnsubscribeRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const firebaseAuth = auth;
    const firestore = db;

    if (!firebaseAuth || !firestore) {
      setIsHydrated(true);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
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
          const profile = snapshot.data() as { name?: string; themeId?: string; email?: string } | undefined;
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
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              { merge: true }
            );
          }

          setUser({
            id: firebaseUser.uid,
            name: displayName,
            email: firebaseUser.email ?? profile?.email ?? '',
            themeId: profile?.themeId ?? 'ocean',
          });
        },
        (error) => {
          console.error('Failed to observe Firebase user profile', error);
          setUser(buildFallbackAuthUser(firebaseUser));
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
    };
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
      await signInWithEmailAndPassword(auth!, normalizedEmail, normalizedPassword);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
    }
  };

  const signInWithGoogleIdToken: AuthContextValue['signInWithGoogleIdToken'] = async (idToken, accessToken) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    const normalizedIdToken = idToken?.trim() ?? '';
    const normalizedAccessToken = accessToken?.trim() || undefined;
    if (!normalizedIdToken) {
      return {
        ok: false,
        error: 'Google sign-in did not return an ID token.',
      };
    }

    try {
      const credential = GoogleAuthProvider.credential(normalizedIdToken, normalizedAccessToken);
      const result = await signInWithCredential(auth!, credential);

      await syncSignedInUserProfile(result.user);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
    }
  };

  const signInWithProvider: AuthContextValue['signInWithProvider'] = async (provider) => {
    const configError = ensureFirebaseConfigured();
    if (configError) {
      return configError;
    }

    if (Platform.OS !== 'web') {
      return {
        ok: false,
        error: 'Google/Apple/Microsoft login is enabled on web. Use email login on mobile for now.',
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

    const providerInstance =
      provider === 'google'
        ? new GoogleAuthProvider()
        : provider === 'apple'
          ? new OAuthProvider('apple.com')
          : new OAuthProvider('microsoft.com');

    if (provider === 'google') {
      providerInstance.setCustomParameters({
        prompt: 'select_account',
      });
    }

    try {
      const result = await signInWithPopup(auth!, providerInstance);
      await syncSignedInUserProfile(result.user);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: mapFirebaseAuthError(error) };
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
      const credential = await createUserWithEmailAndPassword(auth!, normalizedEmail, normalizedPassword);
      await updateProfile(credential.user, { displayName: normalizedName });

      await setDoc(
        doc(db!, 'users', credential.user.uid),
        {
          name: normalizedName,
          email: normalizedEmail,
          themeId: 'ocean',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

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

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isHydrated,
      signIn,
      signInWithGoogleIdToken,
      signInWithProvider,
      signUp,
      signOut,
    }),
    [isHydrated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
