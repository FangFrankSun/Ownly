import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '@/components/app/auth-context';
import { type LanguagePreference, useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';

export default function SettingsScreen() {
  const { t } = useLanguage();

  return (
    <ScreenShell title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <SettingsContent />
    </ScreenShell>
  );
}

export function SettingsContent() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { effectiveLanguage, languagePreference, setLanguagePreference, t } = useLanguage();
  const { theme, themes, setThemeById } = useAppTheme();
  const [reminders, setReminders] = useState(true);
  const [sync, setSync] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const selectedLanguage = languagePreference ?? effectiveLanguage;

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      <AppCard delay={90}>
        <SectionLabel text={t('settings.profile')} />
        <CardTitle accent={theme.secondary} icon="person" title={t('settings.you')} />
        <Text style={styles.name}>Testing Mode</Text>
        <Text style={styles.email}>User data hidden</Text>
        <AnimatedPressable onPress={onSignOut} style={[styles.logoutButton, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.logoutButtonText, { color: theme.primary }]}>{t('settings.logout')}</Text>
        </AnimatedPressable>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text={t('settings.theme')} />
        <CardTitle accent={theme.primary} icon="palette" title={t('settings.chooseLook')} />
        <View style={styles.themeGrid}>
          {themes.map((option, index) => {
            const selected = option.id === theme.id;
            return (
              <Animated.View key={option.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                <AnimatedPressable
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
                  <Text style={styles.themeName}>{t(`theme.${option.id}`)}</Text>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>
      </AppCard>

      <AppCard delay={220}>
        <SectionLabel text={t('settings.preferences')} />
        <SettingRow
          label={t('settings.dailyReminders')}
          value={reminders}
          onChange={setReminders}
          accentColor={theme.primary}
        />
        <SettingRow label={t('settings.cloudSync')} value={sync} onChange={setSync} accentColor={theme.primary} />
        <SettingRow
          label={t('settings.focusMode')}
          value={focusMode}
          onChange={setFocusMode}
          accentColor={theme.primary}
        />
      </AppCard>

      <AppCard delay={280}>
        <SectionLabel text={t('settings.language')} />
        <CardTitle accent={theme.primary} icon="language" title={t('settings.languageTitle')} />
        <Text style={styles.languageHint}>{t('settings.languageHint')}</Text>
        <View style={styles.languageGrid}>
          {LANGUAGE_OPTIONS.map((option, index) => {
            const selected = option.id === selectedLanguage;
            return (
              <Animated.View key={option.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                <AnimatedPressable
                  onPress={() => setLanguagePreference(option.id)}
                  style={[
                    styles.languageCard,
                    selected && styles.languageCardActive,
                    selected && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` },
                  ]}>
                  <Text style={[styles.languageTitle, selected && { color: theme.primary }]}>{t(option.labelKey)}</Text>
                  <Text style={styles.languageMeta}>{option.id === 'en' ? 'EN' : '中文'}</Text>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>
      </AppCard>
    </>
  );
}

const LANGUAGE_OPTIONS: { id: NonNullable<LanguagePreference>; labelKey: string }[] = [
  { id: 'en', labelKey: 'language.english' },
  { id: 'zh', labelKey: 'language.chinese' },
];

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
    fontSize: 22,
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
  languageHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#66708B',
    fontWeight: '600',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageCard: {
    width: '48%',
    minWidth: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6DDEC',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  languageCardActive: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  languageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2133',
  },
  languageMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#76809A',
  },
});
