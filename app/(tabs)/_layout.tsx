import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <OwnlyTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('tabs.tasks'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: t('tabs.exercise'),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: t('tabs.diet'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}

const TAB_ICONS = {
  dashboard: 'square.grid.2x2.fill',
  tasks: 'checkmark.circle.fill',
  calendar: 'calendar',
  exercise: 'figure.run',
  diet: 'leaf.fill',
  settings: 'gearshape.fill',
} as const;

function OwnlyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const inactiveTintColor = colorScheme === 'dark' ? '#8F96A3' : '#7B8091';
  const activeTintColor = theme.primary ?? Colors[colorScheme ?? 'light'].tint;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarWrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: `${theme.tabBorder}80`,
          backgroundColor: '#F7FAFF',
        },
      ]}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const label =
            typeof descriptor.options.tabBarLabel === 'string'
              ? descriptor.options.tabBarLabel
              : typeof descriptor.options.title === 'string'
                ? descriptor.options.title
                : route.name;
          const isFocused = state.index === index;
          const tintColor = isFocused ? activeTintColor : inactiveTintColor;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? `${label} tab`}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              hitSlop={10}
              onLongPress={onLongPress}
              onPress={onPress}
              style={styles.tabButton}
              testID={descriptor.options.tabBarButtonTestID ?? `tab-${route.name}`}>
              <IconSymbol color={tintColor} name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]} size={26} />
              <Text style={[styles.tabLabel, { color: tintColor }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
