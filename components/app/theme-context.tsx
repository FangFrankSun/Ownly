import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth-context';
import { supabase } from './supabase-client';

export type AppTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  pageBackground: string;
  orbA: string;
  orbB: string;
  tabBackground: string;
  tabBorder: string;
};

const APP_THEMES: AppTheme[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    primary: '#2F52D0',
    secondary: '#1F7AA8',
    pageBackground: '#F2F5FC',
    orbA: '#CCD9FF',
    orbB: '#DDF7EA',
    tabBackground: 'rgba(247,249,253,0.78)',
    tabBorder: 'rgba(173,187,217,0.35)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primary: '#D85A32',
    secondary: '#C03A6B',
    pageBackground: '#FFF5F1',
    orbA: '#FFD9C8',
    orbB: '#FFE7C2',
    tabBackground: 'rgba(255,245,241,0.8)',
    tabBorder: 'rgba(227,164,139,0.35)',
  },
  {
    id: 'mint',
    name: 'Mint',
    primary: '#167B5F',
    secondary: '#239B7A',
    pageBackground: '#EEF9F4',
    orbA: '#CCF0E4',
    orbB: '#D8F8EE',
    tabBackground: 'rgba(238,249,244,0.8)',
    tabBorder: 'rgba(120,191,168,0.35)',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    primary: '#6B4FD9',
    secondary: '#9B5DE5',
    pageBackground: '#F4F1FF',
    orbA: '#DED4FF',
    orbB: '#EBDDFF',
    tabBackground: 'rgba(244,241,255,0.8)',
    tabBorder: 'rgba(165,148,218,0.35)',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    primary: '#38435A',
    secondary: '#5A6A88',
    pageBackground: '#EEF1F7',
    orbA: '#D7DEEB',
    orbB: '#DDE5F5',
    tabBackground: 'rgba(238,241,247,0.8)',
    tabBorder: 'rgba(139,154,184,0.35)',
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: '#C03A6B',
    secondary: '#EA5A7F',
    pageBackground: '#FFF1F6',
    orbA: '#FFD6E6',
    orbB: '#FFE1F0',
    tabBackground: 'rgba(255,241,246,0.8)',
    tabBorder: 'rgba(224,141,177,0.35)',
  },
];

type ThemeContextValue = {
  theme: AppTheme;
  themes: AppTheme[];
  setThemeById: (themeId: string) => void;
};

const DEFAULT_THEME_ID = 'ocean';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeById(themeId: string | null | undefined) {
  if (!themeId) {
    return APP_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ?? APP_THEMES[0];
  }
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    setThemeId(getThemeById(user?.themeId).id);
  }, [user?.themeId]);

  const setThemeById = useCallback((nextThemeId: string) => {
    const next = getThemeById(nextThemeId);
    setThemeId(next.id);

    if (user && supabase) {
      void supabase.auth.updateUser({
        data: {
          theme_id: next.id,
        },
      });
    }
  }, [user]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: getThemeById(themeId),
      themes: APP_THEMES,
      setThemeById,
    }),
    [setThemeById, themeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside a ThemeProvider');
  }

  return context;
}
