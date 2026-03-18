import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './auth-context';
import { LanguageProvider } from './language-context';
import { TasksProvider } from './tasks-context';
import { ThemeProvider as AppThemeProvider, useAppTheme } from './theme-context';
import { WellnessProvider } from './wellness-context';

export function ProtectedAppShell({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <LanguageProvider>
          <AppThemeProvider>
            <TasksProvider>
              <WellnessProvider>
                <AuthGate />
                <Stack>
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="oauthredirect" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="task-editor"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="auto" />
              </WellnessProvider>
            </TasksProvider>
          </AppThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isHydrated } = useAuth();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const inLoginScreen = pathname === '/login';
    const publicPaths = new Set(['/', '/privacy', '/terms', '/data-deletion']);
    const inPublicPath = publicPaths.has(pathname);

    if (!isAuthenticated && !inLoginScreen && !inPublicPath) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  if (!isHydrated) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F2F5FC',
          zIndex: 20,
        }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return null;
}
