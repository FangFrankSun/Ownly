import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/components/app/theme-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_BAR_GLASS_BG_WEB = 'rgba(247, 250, 255, 0.26)';
const TAB_BAR_GLASS_BG_NATIVE = 'rgba(247, 250, 255, 0.95)';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppTheme();

  return (
    <Tabs
      initialRouteName="tasks"
      screenOptions={{
        tabBarActiveTintColor: theme.primary ?? Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#8F96A3' : '#7B8091',
        tabBarStyle: {
          height: Platform.select({ ios: 86, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, default: 10 }),
          backgroundColor: Platform.OS === 'web' ? 'transparent' : TAB_BAR_GLASS_BG_NATIVE,
          borderTopWidth: 1,
          borderTopColor: `${theme.tabBorder}80`,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'hidden',
        },
        tabBarBlurEffect: undefined,
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: Platform.OS === 'web' ? TAB_BAR_GLASS_BG_WEB : TAB_BAR_GLASS_BG_NATIVE,
              },
              {
                borderTopColor: `${theme.tabBorder}80`,
              },
              Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any) : null,
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="checkmark.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: 'Exercise',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="figure.run" color={color} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: 'Diet',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="leaf.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
