import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '@/components/app/auth-context';
import { useAppTheme } from '@/components/app/theme-context';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, themes, setThemeById } = useAppTheme();
  const [reminders, setReminders] = useState(true);
  const [sync, setSync] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ScreenShell title="Settings" subtitle="Personalize your experience.">
      <AppCard delay={90}>
        <SectionLabel text="Profile" />
        <CardTitle accent={theme.secondary} icon="person" title="You" />
        <Text style={styles.name}>{user?.name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email ?? 'unknown@example.com'}</Text>
        <Pressable onPress={onSignOut} style={[styles.logoutButton, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.logoutButtonText, { color: theme.primary }]}>Log Out</Text>
        </Pressable>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Theme" />
        <CardTitle accent={theme.primary} icon="palette" title="Choose Look" />
        <View style={styles.themeGrid}>
          {themes.map((option) => {
            const selected = option.id === theme.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setThemeById(option.id)}
                style={[
                  styles.themeCard,
                  selected && styles.themeCardActive,
                  selected && { borderColor: option.primary },
                ]}>
                <View style={styles.themeSwatches}>
                  <View style={[styles.themeSwatch, { backgroundColor: option.primary }]} />
                  <View style={[styles.themeSwatch, { backgroundColor: option.secondary }]} />
                  <View style={[styles.themeSwatch, { backgroundColor: option.orbA }]} />
                </View>
                <Text style={styles.themeName}>{option.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard delay={220}>
        <SectionLabel text="Preferences" />
        <SettingRow
          label="Daily reminders"
          value={reminders}
          onChange={setReminders}
          accentColor={theme.primary}
        />
        <SettingRow label="Cloud sync" value={sync} onChange={setSync} accentColor={theme.primary} />
        <SettingRow
          label="Focus mode by default"
          value={focusMode}
          onChange={setFocusMode}
          accentColor={theme.primary}
        />
      </AppCard>
    </ScreenShell>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor: string;
}) {
  return (
    <View
      style={[
        styles.settingRow,
        {
          backgroundColor: `${accentColor}12`,
          borderColor: `${accentColor}2A`,
        },
      ]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        trackColor={{ false: `${accentColor}36`, true: `${accentColor}66` }}
        thumbColor={value ? accentColor : '#FFFFFF'}
        ios_backgroundColor={`${accentColor}36`}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#1A2133',
  },
  email: {
    fontSize: 14,
    color: '#66708B',
  },
  logoutButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E9EEFF',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F52D0',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '31%',
    minWidth: 96,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D6DDEC',
    backgroundColor: '#F8FAFF',
    gap: 8,
  },
  themeCardActive: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  themeSwatches: {
    flexDirection: 'row',
    gap: 6,
  },
  themeSwatch: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  themeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2133',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7F9FE',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2133',
    maxWidth: '74%',
  },
});
