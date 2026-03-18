import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    material: require('../assets/fonts/MaterialIcons.ttf'),
    'material-community': require('../assets/fonts/MaterialCommunityIcons.ttf'),
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);
  const isPublicWebLandingPage = Platform.OS === 'web' && pathname === '/';

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

  if (isPublicWebLandingPage) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
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
      </ThemeProvider>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProtectedAppShell } = require('@/components/app/protected-app-shell') as typeof import('@/components/app/protected-app-shell');

  return <ProtectedAppShell colorScheme={colorScheme} />;
}
