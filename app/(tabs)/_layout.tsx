import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/components/app/language-context';
import { useTasks } from '@/components/app/tasks-context';
import { useAppTheme } from '@/components/app/theme-context';
import { useDesktopExperience } from '@/components/app/use-desktop-experience';
import { AppIcon } from '@/components/ui/app-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { SettingsContent } from './settings';

const DESKTOP_SIDEBAR_WIDTH = 340;
const DESKTOP_RAIL_WIDTH = 52;
const DESKTOP_RAIL_TOP_ROUTES: Array<keyof typeof DESKTOP_TAB_ICONS> = ['tasks', 'calendar', 'health'];
const DESKTOP_RAIL_BOTTOM_ROUTES: Array<keyof typeof DESKTOP_TAB_ICONS> = ['settings'];
const DESKTOP_TASK_CHILDREN = ['todo', 'notes'] as const;
const DESKTOP_HEALTH_CHILDREN = ['exercise', 'diet'] as const;
const MOBILE_TAB_ORDER: Array<keyof typeof TAB_ICONS> = ['dashboard', 'tasks', 'calendar', 'health', 'settings'];

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.trim();
  const clamped = Math.max(0, Math.min(1, alpha));
  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const compact = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
    if (compact.length === 6) {
      const r = Number.parseInt(compact.slice(0, 2), 16);
      const g = Number.parseInt(compact.slice(2, 4), 16);
      const b = Number.parseInt(compact.slice(4, 6), 16);
      if (![r, g, b].some((value) => Number.isNaN(value))) {
        return `rgba(${r}, ${g}, ${b}, ${clamped})`;
      }
    }
  }
  if (normalized.startsWith('rgb(')) {
    return normalized.replace('rgb(', 'rgba(').replace(')', `, ${clamped})`);
  }
  return normalized;
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { theme } = useAppTheme();
  const { isCompactDesktop, isDesktopExperience } = useDesktopExperience();
  const desktop = isDesktopExperience;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [compactPaneOpen, setCompactPaneOpen] = useState(false);
  const desktopCalendarMode = desktop && /(^|\/)calendar\/?$/.test(pathname);

  useEffect(() => {
    if (!desktop || !isCompactDesktop || desktopCalendarMode) {
      setCompactPaneOpen(false);
    }
  }, [desktop, desktopCalendarMode, isCompactDesktop]);

  useEffect(() => {
    setCompactPaneOpen(false);
  }, [pathname]);

  const sceneStyle = useMemo(
    () => ({
      backgroundColor: theme.pageBackground,
      ...(desktop
        ? {
            paddingLeft:
              desktopCalendarMode || isCompactDesktop ? DESKTOP_RAIL_WIDTH : DESKTOP_SIDEBAR_WIDTH,
          }
        : null),
    }),
    [desktop, desktopCalendarMode, isCompactDesktop, theme.pageBackground]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBackground }}>
      <Tabs
        detachInactiveScreens={false}
        tabBar={(props) =>
          desktop ? (
            <DesktopSidebarTabBar
              {...props}
              compact={isCompactDesktop}
              paneOpen={compactPaneOpen}
              onClosePane={() => setCompactPaneOpen(false)}
              onOpenSettings={() => setSettingsModalOpen(true)}
            />
          ) : (
            <CrossfadeTabBar {...props} />
          )
        }
        screenOptions={{
          headerShown: false,
          sceneStyle,
          lazy: false,
          freezeOnBlur: false,
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('tabs.dashboard'),
            href: desktop ? null : undefined,
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
          name="health"
          options={{
            title: t('tabs.health'),
          }}
        />
        <Tabs.Screen
          name="exercise"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="diet"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
          }}
        />
      </Tabs>
      {desktop && isCompactDesktop && !desktopCalendarMode ? (
        <Pressable
          accessibilityLabel={compactPaneOpen ? 'Hide workspace menu' : 'Show workspace menu'}
          accessibilityRole="button"
          onPress={() => setCompactPaneOpen((open) => !open)}
          style={[
            styles.compactMenuButton,
            {
              top: Math.max(insets.top, 8) + 8,
              left: DESKTOP_RAIL_WIDTH + 10,
              borderColor: `${theme.tabBorder}D8`,
              backgroundColor: colorWithAlpha(theme.pageBackground, 0.95),
            },
          ]}>
          <AppIcon color={theme.primary} family="community" name="menu" size={20} />
        </Pressable>
      ) : null}
      {desktop ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setSettingsModalOpen(false)}
          transparent
          visible={settingsModalOpen}>
          <View style={styles.settingsOverlay}>
            <Pressable
              onPress={() => setSettingsModalOpen(false)}
              style={styles.settingsBackdrop}
            />
            <View
              style={[
                styles.settingsModal,
                {
                  backgroundColor: theme.pageBackground,
                  borderColor: `${theme.tabBorder}`,
                },
              ]}>
              <View style={[styles.settingsModalHeader, { borderBottomColor: `${theme.tabBorder}AA` }]}>
                <Text style={styles.settingsModalTitle}>{t('settings.title')}</Text>
                <Pressable
                  accessibilityLabel="Close settings"
                  onPress={() => setSettingsModalOpen(false)}
                  style={styles.settingsCloseButton}>
                  <AppIcon color="#526080" name="close" size={18} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.settingsModalContent}>
                <SettingsContent />
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const TAB_ICONS = {
  dashboard: 'square.grid.2x2.fill',
  tasks: 'checkmark.circle.fill',
  calendar: 'calendar',
  health: 'figure.run',
  settings: 'gearshape.fill',
} as const;

const DESKTOP_TAB_ICONS = {
  tasks: TAB_ICONS.tasks,
  calendar: TAB_ICONS.calendar,
  health: TAB_ICONS.health,
  settings: TAB_ICONS.settings,
} as const;

/* ── Tab button with scale-only animation (no pill bg) ── */
function TabItem({
  route,
  isFocused,
  label,
  activeTintColor,
  inactiveTintColor,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
}: {
  route: { name: string; key: string };
  isFocused: boolean;
  label: string;
  activeTintColor: string;
  inactiveTintColor: string;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const pressScale = useSharedValue(1);
  const iconScale = useSharedValue(isFocused ? 1.15 : 1);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0.55);
  const prevFocused = useRef(isFocused);

  useEffect(() => {
    if (prevFocused.current === isFocused) return;
    prevFocused.current = isFocused;

    iconScale.value = isFocused
      ? withSequence(
          withTiming(1.24, {
            duration: 150,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1.15, {
            duration: 220,
            easing: Easing.out(Easing.quad),
          })
        )
      : withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
        });
    labelOpacity.value = withTiming(isFocused ? 1 : 0.55, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  }, [isFocused, iconScale, labelOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value * pressScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const tintColor = isFocused ? activeTintColor : inactiveTintColor;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `${label} tab`}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      hitSlop={10}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withTiming(0.9, {
          duration: 70,
          easing: Easing.out(Easing.quad),
        });
      }}
      onPressOut={() => {
        pressScale.value = withTiming(1, {
          duration: 130,
          easing: Easing.out(Easing.quad),
        });
      }}
      style={styles.tabButton}
      testID={testID ?? `tab-${route.name}`}>
      <Animated.View style={iconStyle}>
        <IconSymbol
          color={tintColor}
          name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
          size={26}
        />
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, { color: tintColor }, labelStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/* ── Tab bar ── */
function CrossfadeTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const inactiveTintColor = '#7B8091';
  const activeTintColor = theme.primary ?? Colors.light.tint;

  const bgColor = Platform.OS === 'web'
    ? theme.tabBackground?.replace(/[\d.]+\)$/, '1)') ?? 'rgba(247,249,253,1)'
    : theme.tabBackground ?? 'rgba(247,249,253,0.92)';

  return (
    <View
      style={[
        styles.tabBarWrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: `${theme.tabBorder}`,
          backgroundColor: bgColor,
        },
      ]}>
      <View style={styles.tabRow}>
        {MOBILE_TAB_ORDER.map((routeName) => state.routes.find((route) => route.name === routeName))
          .filter((route): route is (typeof state.routes)[number] => Boolean(route))
          .map((route) => {
            const descriptor = descriptors[route.key];
            const label =
              typeof descriptor.options.tabBarLabel === 'string'
                ? descriptor.options.tabBarLabel
                : typeof descriptor.options.title === 'string'
                  ? descriptor.options.title
                  : route.name;
            const isFocused = state.routes[state.index]?.key === route.key;

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
              <TabItem
                key={route.key}
                accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
                activeTintColor={activeTintColor}
                inactiveTintColor={inactiveTintColor}
                isFocused={isFocused}
                label={label}
                onLongPress={onLongPress}
                onPress={onPress}
                route={route}
                testID={descriptor.options.tabBarButtonTestID}
              />
            );
          })}
      </View>
    </View>
  );
}

function DesktopSidebarTabBar({
  state,
  descriptors,
  navigation,
  compact,
  paneOpen,
  onClosePane,
  onOpenSettings,
}: BottomTabBarProps & {
  compact: boolean;
  paneOpen: boolean;
  onClosePane: () => void;
  onOpenSettings: () => void;
}) {
  const { theme } = useAppTheme();
  const { tasks } = useTasks();
  const insets = useSafeAreaInsets();
  const desktopRoutes = state.routes.filter((route) => route.name in DESKTOP_TAB_ICONS);
  const activeTintColor = theme.primary;
  const inactiveTintColor = colorWithAlpha(theme.primary, 0.68);
  const railBg = theme.primary;
  const railIconTint = colorWithAlpha('#FFFFFF', 0.93);
  const railActiveBg = colorWithAlpha('#FFFFFF', 0.18);
  const railAvatarBg = colorWithAlpha('#000000', 0.14);
  const paneBg = colorWithAlpha(theme.primary, 0.08);
  const dividerColor = colorWithAlpha(theme.primary, 0.16);
  const focusedListBg = colorWithAlpha(theme.primary, 0.14);
  const sectionTitleColor = colorWithAlpha(theme.primary, 0.66);
  const listLabelColor = colorWithAlpha(theme.primary, 0.78);
  const countColor = colorWithAlpha(theme.primary, 0.68);

  const { activeCount, todayCount, nextSevenCount } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
    const endOfNextSeven = startOfToday + 7 * 24 * 60 * 60 * 1000;
    let active = 0;
    let dueToday = 0;
    let nextSeven = 0;

    for (const task of tasks) {
      if (!task.done) {
        active += 1;
      }
      const date = new Date(task.scheduledAt).getTime();
      if (!Number.isNaN(date)) {
        if (date >= startOfToday && date < startOfTomorrow && !task.done) {
          dueToday += 1;
        }
        if (date >= startOfToday && date < endOfNextSeven && !task.done) {
          nextSeven += 1;
        }
      }
    }

    return {
      activeCount: active,
      todayCount: dueToday,
      nextSevenCount: nextSeven,
    };
  }, [tasks]);

  const routeCount = (routeName: string) => {
    if (routeName === 'tasks') return activeCount;
    if (routeName === 'calendar') return todayCount + nextSevenCount;
    if (routeName === 'health') return activeCount;
    return null;
  };

  const findRouteByName = (name: keyof typeof DESKTOP_TAB_ICONS) =>
    desktopRoutes.find((route) => route.name === name) ?? null;

  const isFocusedRoute = (routeKey: string) => state.routes[state.index]?.key === routeKey;

  const getRouteLabel = (route: { name: string; key: string }) => {
    const descriptor = descriptors[route.key];
    return typeof descriptor.options.tabBarLabel === 'string'
      ? descriptor.options.tabBarLabel
      : typeof descriptor.options.title === 'string'
        ? descriptor.options.title
        : route.name;
  };

  const navigateToRoute = (route: { name: string; key: string }, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name as never);
    }
  };

  const tasksRoute = findRouteByName('tasks');
  const taskParams = (tasksRoute?.params ?? {}) as { section?: string };
  const taskSection = taskParams.section === 'notes' ? 'notes' : 'todo';
  const tasksFocused = Boolean(tasksRoute?.key && isFocusedRoute(tasksRoute.key));
  const todoFocused = tasksFocused && taskSection === 'todo';
  const notesFocused = tasksFocused && taskSection === 'notes';

  const healthRoute = findRouteByName('health');
  const healthParams = (healthRoute?.params ?? {}) as { section?: string };
  const healthSection = healthParams.section === 'diet' ? 'diet' : 'exercise';
  const healthFocused = Boolean(healthRoute?.key && isFocusedRoute(healthRoute.key));
  const exerciseFocused = healthFocused && healthSection === 'exercise';
  const dietFocused = healthFocused && healthSection === 'diet';
  const calendarRoute = findRouteByName('calendar');
  const calendarFocused = Boolean(calendarRoute?.key && isFocusedRoute(calendarRoute.key));

  const openTaskSection = (section: (typeof DESKTOP_TASK_CHILDREN)[number]) => {
    if (!tasksRoute) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: tasksRoute.key,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) return;
    const params = { section };
    navigation.navigate({ name: 'tasks', params } as never);
  };

  const openHealthSection = (section: (typeof DESKTOP_HEALTH_CHILDREN)[number]) => {
    if (!healthRoute) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: healthRoute.key,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) return;
    navigation.navigate({ name: 'health', params: { section } } as never);
  };

  const showWorkspacePane = !calendarFocused && (!compact || paneOpen);
  const sidebarWidth = compact
    ? paneOpen
      ? '100%'
      : DESKTOP_RAIL_WIDTH
    : calendarFocused
      ? DESKTOP_RAIL_WIDTH
      : DESKTOP_SIDEBAR_WIDTH;

  return (
    <View
      style={[
        styles.desktopSidebar,
        {
          width: sidebarWidth,
          paddingTop: Math.max(8, insets.top),
          borderRightColor: compact ? 'transparent' : `${theme.tabBorder}95`,
          backgroundColor: compact ? 'transparent' : paneBg,
        },
      ]}>
      {compact && paneOpen && !calendarFocused ? (
        <Pressable
          accessibilityLabel="Close workspace menu"
          onPress={onClosePane}
          style={styles.desktopCompactBackdrop}
        />
      ) : null}
      <View style={[styles.desktopRail, compact ? styles.desktopRailFloating : null, { backgroundColor: railBg }]}>
        <Pressable
          accessibilityLabel="Health"
          accessibilityRole="button"
          onPress={() => openHealthSection('exercise')}
          style={[styles.desktopRailIcon, styles.desktopRailAvatar, healthFocused ? { backgroundColor: railActiveBg } : { backgroundColor: railAvatarBg }]}>
          <AppIcon color={railIconTint} name="person" size={22} />
        </Pressable>
        {DESKTOP_RAIL_TOP_ROUTES.map((routeName) => {
          const route = findRouteByName(routeName);
          if (!route) return null;
          const focused =
            routeName === 'tasks'
              ? tasksFocused
              : routeName === 'health'
                ? healthFocused
                : isFocusedRoute(route.key);
          return (
            <Pressable
              key={route.key}
              accessibilityLabel={`${getRouteLabel(route)} tab`}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                if (routeName === 'tasks') {
                  openTaskSection('todo');
                  return;
                }
                if (routeName === 'health') {
                  openHealthSection('exercise');
                  return;
                }
                navigateToRoute(route, focused);
              }}
              style={[
                styles.desktopRailIcon,
                focused ? { backgroundColor: railActiveBg } : null,
              ]}>
              <IconSymbol color={railIconTint} name={TAB_ICONS[routeName]} size={21} />
            </Pressable>
          );
        })}
        <View style={styles.desktopRailSpacer} />
        {DESKTOP_RAIL_BOTTOM_ROUTES.map((routeName) => {
          const route = findRouteByName(routeName);
          if (!route) return null;
          const focused = isFocusedRoute(route.key);
          return (
            <Pressable
              key={route.key}
              accessibilityLabel={`${getRouteLabel(route)} tab`}
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={[styles.desktopRailIcon, focused ? { backgroundColor: railActiveBg } : null]}>
              <IconSymbol color={railIconTint} name={TAB_ICONS[routeName]} size={21} />
            </Pressable>
          );
        })}
      </View>

      {showWorkspacePane ? (
        <ScrollView
          contentContainerStyle={styles.desktopListPaneContent}
          showsVerticalScrollIndicator={false}
          style={[
            styles.desktopListPane,
            compact ? styles.desktopListPaneDrawer : null,
            {
              backgroundColor: paneBg,
              borderRightColor: `${theme.tabBorder}9A`,
            },
          ]}>
          <Text style={[styles.desktopSectionTitle, { color: sectionTitleColor }]}>Workspace</Text>

          {tasksFocused ? (
            <View style={styles.desktopRouteGroup}>
              {(() => {
                const route = findRouteByName('tasks');
                if (!route) return null;
                return (
                  <DesktopSidebarItem
                    activeTintColor={activeTintColor}
                    count={routeCount(route.name)}
                    focusedBackgroundColor={focusedListBg}
                    inactiveTintColor={inactiveTintColor}
                    isFocused={tasksFocused}
                    key={route.key}
                    label={getRouteLabel(route)}
                    onPress={() => openTaskSection('todo')}
                    routeName="tasks"
                    variant="large"
                  />
                );
              })()}
              <View style={styles.desktopSubRouteGroup}>
                <DesktopSidebarSubItem
                  count={activeCount}
                  isFocused={todoFocused}
                  label="To do list"
                  onPress={() => openTaskSection('todo')}
                  selectedBackground={focusedListBg}
                  textColor={listLabelColor}
                  tintColor={countColor}
                />
              </View>
            </View>
          ) : null}

          {healthFocused ? (
            <View style={styles.desktopRouteGroup}>
              {(() => {
                const route = findRouteByName('health');
                if (!route) return null;
                return (
                  <DesktopSidebarItem
                    activeTintColor={activeTintColor}
                    count={activeCount}
                    focusedBackgroundColor={focusedListBg}
                    inactiveTintColor={inactiveTintColor}
                    isFocused={healthFocused}
                    key={route.key}
                    label={getRouteLabel(route)}
                    onPress={() => openHealthSection('exercise')}
                    routeName="health"
                    variant="large"
                  />
                );
              })()}
              <View style={styles.desktopSubRouteGroup}>
                <DesktopSidebarSubItem
                  isFocused={exerciseFocused}
                  label="Exercise"
                  onPress={() => openHealthSection('exercise')}
                  selectedBackground={focusedListBg}
                  textColor={listLabelColor}
                  tintColor={countColor}
                />
                <DesktopSidebarSubItem
                  isFocused={dietFocused}
                  label="Diet"
                  onPress={() => openHealthSection('diet')}
                  selectedBackground={focusedListBg}
                  textColor={listLabelColor}
                  tintColor={countColor}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function DesktopSidebarItem({
  routeName,
  label,
  isFocused,
  onPress,
  activeTintColor,
  inactiveTintColor,
  count,
  focusedBackgroundColor,
  variant = 'default',
}: {
  routeName: keyof typeof TAB_ICONS;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  activeTintColor: string;
  inactiveTintColor: string;
  count: number | null;
  focusedBackgroundColor: string;
  variant?: 'default' | 'large';
}) {
  const tintColor = isFocused ? activeTintColor : inactiveTintColor;
  const large = variant === 'large';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={[
        styles.desktopRouteItem,
        large ? styles.desktopRouteItemLarge : null,
        isFocused ? { backgroundColor: focusedBackgroundColor } : null,
      ]}>
      <IconSymbol color={tintColor} name={TAB_ICONS[routeName]} size={large ? 22 : 20} />
      <Text style={[styles.desktopRouteText, large ? styles.desktopRouteTextLarge : null, { color: tintColor }]}>{label}</Text>
      {typeof count === 'number' ? <Text style={[styles.desktopRouteCount, large ? styles.desktopRouteCountLarge : null, { color: tintColor }]}>{count}</Text> : null}
    </Pressable>
  );
}

function DesktopSidebarSubItem({
  label,
  isFocused,
  onPress,
  count,
  selectedBackground,
  textColor,
  tintColor,
}: {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  count?: number;
  selectedBackground: string;
  textColor: string;
  tintColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      style={[styles.desktopSubRouteItem, isFocused ? { backgroundColor: selectedBackground } : null]}>
      <Text style={[styles.desktopSubRouteText, { color: textColor }]}>{label}</Text>
      {typeof count === 'number' ? <Text style={[styles.desktopSubRouteCount, { color: tintColor }]}>{count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create<Record<string, any>>({
  desktopSidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DESKTOP_SIDEBAR_WIDTH,
    flexDirection: 'row',
    borderRightWidth: 1,
  },
  desktopRail: {
    width: DESKTOP_RAIL_WIDTH,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  desktopRailFloating: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 7,
  },
  desktopRailAvatar: {
    marginTop: 4,
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  desktopRailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopRailSpacer: {
    flex: 1,
  },
  desktopListPane: {
    flex: 1,
  },
  desktopListPaneDrawer: {
    position: 'absolute',
    left: DESKTOP_RAIL_WIDTH,
    top: 0,
    bottom: 0,
    width: 286,
    borderRightWidth: 1,
    zIndex: 8,
    shadowColor: '#17203A',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 18,
  },
  desktopListPaneContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  desktopSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 7,
    marginTop: 4,
  },
  desktopRouteGroup: {
    gap: 6,
  },
  desktopSubRouteGroup: {
    gap: 4,
    marginLeft: 10,
    marginTop: -2,
  },
  desktopRouteItem: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopRouteItemLarge: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  desktopRouteText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  desktopRouteTextLarge: {
    fontSize: 15,
    fontWeight: '700',
  },
  desktopRouteCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  desktopRouteCountLarge: {
    fontSize: 14,
    fontWeight: '800',
  },
  desktopDivider: {
    height: 1,
    marginVertical: 12,
  },
  desktopMetaRow: {
    minHeight: 32,
    borderRadius: 9,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  desktopMetaLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  desktopMetaCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  desktopSubRouteItem: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  desktopSubRouteText: {
    fontSize: 13,
    fontWeight: '500',
  },
  desktopSubRouteCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  desktopCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  desktopCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  desktopCompactBackdrop: {
    ...StyleSheet.absoluteFillObject,
    left: DESKTOP_RAIL_WIDTH,
    backgroundColor: 'rgba(10, 16, 32, 0.26)',
    zIndex: 6,
  },
  tabBarWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
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
  settingsOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 20, 34, 0.35)',
  },
  settingsModal: {
    width: '92%',
    maxWidth: 860,
    maxHeight: '86%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsModalHeader: {
    height: 52,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2133',
  },
  settingsCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FA',
  },
  settingsModalContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  compactMenuButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
});
