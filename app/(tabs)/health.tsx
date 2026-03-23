import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { ScreenShell } from '@/components/app/screen-shell';

import DietScreen from './diet';
import ExerciseScreen from './exercise';

type HealthSection = 'exercise' | 'diet';

export default function HealthScreen() {
  const { t } = useLanguage();
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const [section, setSection] = useState<HealthSection>('exercise');
  const incomingSection = Array.isArray(params.section) ? params.section[0] : params.section;

  useEffect(() => {
    if (incomingSection === 'diet') {
      setSection('diet');
      return;
    }
    if (incomingSection === 'exercise') {
      setSection('exercise');
    }
  }, [incomingSection]);

  return (
    <ScreenShell
      title={t('tabs.health')}
      subtitle={section === 'exercise' ? t('exercise.subtitle') : t('diet.subtitle')}>
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
      <View style={styles.content}>
        <Animated.View
          key={section}
          entering={FadeIn.duration(220).easing(Easing.out(Easing.quad))}
          style={styles.content}>
          {section === 'exercise' ? <ExerciseScreen embedded /> : <DietScreen embedded />}
        </Animated.View>
      </View>
    </ScreenShell>
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
  const bgOpacity = useSharedValue(active ? 1 : 0);
  const borderScale = useSharedValue(active ? 1 : 0.92);

  bgOpacity.value = withTiming(active ? 1 : 0, { duration: 200 });
  borderScale.value = withTiming(active ? 1 : 0.92, { duration: 200 });

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scaleX: borderScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.95}
      style={[
        styles.segmentButton,
        {
          borderColor: active ? `${primaryColor}88` : '#D9DFEC',
          backgroundColor: active ? `${primaryColor}16` : '#FFFFFF',
        },
      ]}>
      <Text style={[styles.segmentText, { color: active ? primaryColor : '#4F5C79' }]}>{label}</Text>
      <Animated.View
        style={[
          styles.segmentIndicator,
          { backgroundColor: primaryColor },
          indicatorStyle,
        ]}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
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
    overflow: 'hidden',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
});
