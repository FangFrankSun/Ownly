import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';

import DietScreen from './diet';
import ExerciseScreen from './exercise';

type HealthSection = 'exercise' | 'diet';

export default function HealthScreen() {
  const { t } = useLanguage();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<HealthSection>('exercise');
  const topInset = Platform.OS === 'web' ? 14 : Math.max(insets.top, 12) + 6;

  return (
    <View style={[styles.page, { backgroundColor: theme.pageBackground }]}>
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: `${theme.tabBorder}80`,
            backgroundColor: theme.tabBackground,
            paddingTop: topInset,
          },
        ]}>
        <View style={styles.segmentWrap}>
          <SegmentButton
            active={section === 'exercise'}
            label={t('health.exercise')}
            onPress={() => setSection('exercise')}
            primaryColor={theme.primary}
          />
          <SegmentButton
            active={section === 'diet'}
            label={t('health.diet')}
            onPress={() => setSection('diet')}
            primaryColor={theme.primary}
          />
        </View>
      </View>

      <View style={styles.content}>
        {section === 'exercise' ? <ExerciseScreen /> : <DietScreen />}
      </View>
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
  primaryColor,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  primaryColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        {
          borderColor: active ? `${primaryColor}88` : '#D9DFEC',
          backgroundColor: active ? `${primaryColor}16` : '#FFFFFF',
        },
      ]}>
      <Text style={[styles.segmentText, { color: active ? primaryColor : '#4F5C79' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
});
