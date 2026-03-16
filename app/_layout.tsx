import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/app/auth-context';
import { LanguageProvider } from '@/components/app/language-context';
import { TasksProvider } from '@/components/app/tasks-context';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/components/app/theme-context';
import { WellnessProvider } from '@/components/app/wellness-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    material: require('../assets/fonts/MaterialIcons.ttf'),
    'material-community': require('../assets/fonts/MaterialCommunityIcons.ttf'),
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      return;
    }

    const timeout = setTimeout(() => {
      setFontLoadTimedOut(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  if (Platform.OS !== 'web' && !fontsLoaded && !fontLoadTimedOut) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F2F5FC',
        }}>
        <ActivityIndicator color="#3655D0" size="large" />
      </View>
    );
  }

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
    const inRootPath = pathname === '/';

    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inLoginScreen) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && inRootPath) {
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
