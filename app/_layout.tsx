import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/app/auth-context';
import { TasksProvider } from '@/components/app/tasks-context';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/components/app/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppThemeProvider>
          <TasksProvider>
            <AuthGate />
            <Stack>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="task-editor"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </TasksProvider>
        </AppThemeProvider>
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
    const inRootPath = pathname === '/';

    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/(tabs)/tasks');
      return;
    }

    if (isAuthenticated && inRootPath) {
      router.replace('/(tabs)/tasks');
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
