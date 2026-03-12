import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';

export default function SettingsScreen() {
  const [reminders, setReminders] = useState(true);
  const [sync, setSync] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  return (
    <ScreenShell title="Settings" subtitle="Personalize your experience.">
      <AppCard delay={90}>
        <SectionLabel text="Profile" />
        <CardTitle accent="#4F46E5" icon="person" title="You" />
        <Text style={styles.name}>Bigclaw</Text>
        <Text style={styles.email}>you@example.com</Text>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Preferences" />
        <SettingRow label="Daily reminders" value={reminders} onChange={setReminders} />
        <SettingRow label="Cloud sync" value={sync} onChange={setSync} />
        <SettingRow label="Focus mode by default" value={focusMode} onChange={setFocusMode} />
      </AppCard>
    </ScreenShell>
  );
}

function SettingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        trackColor={{ false: '#CCD3E3', true: '#7FA0FF' }}
        thumbColor={value ? '#2446B8' : '#F3F5FB'}
        ios_backgroundColor="#CCD3E3"
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
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
