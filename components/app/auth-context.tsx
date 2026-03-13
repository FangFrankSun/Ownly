import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabase-client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  themeId: string | null;
};

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
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthSuccess | AuthFailure>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSessionUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }

  const metadata = session.user.user_metadata ?? {};
  const derivedName =
    typeof metadata.name === 'string'
      ? metadata.name
      : typeof metadata.full_name === 'string'
        ? metadata.full_name
        : '';

  return {
    id: session.user.id,
    name: derivedName || session.user.email?.split('@')[0] || 'User',
    email: session.user.email ?? '',
    themeId: typeof metadata.theme_id === 'string' ? metadata.theme_id : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setIsHydrated(true);
      return;
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session ?? null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = useMemo(() => mapSessionUser(session), [session]);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        ok: false,
        error: 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Email and password are required.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  };

  const signUp: AuthContextValue['signUp'] = async (name, email, password) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        ok: false,
        error: 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return { ok: false, error: 'Name, email, and password are required.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: {
          name: normalizedName,
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data.session) {
      return {
        ok: true,
        message: 'Account created. Check your email to confirm before signing in.',
      };
    }

    return { ok: true };
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isHydrated,
    signIn,
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
