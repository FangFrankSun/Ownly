import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

type ScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  floatingAction?: ReactNode;
};

type CardProps = {
  children: ReactNode;
  delay?: number;
};

export function ScreenShell({ title, subtitle, children, floatingAction }: ScreenShellProps) {
  return (
    <View style={styles.page}>
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
        {children}
      </ScrollView>
      {floatingAction ? <View style={styles.floatingActionWrap}>{floatingAction}</View> : null}
    </View>
  );
}

export function AppCard({ children, delay = 0 }: CardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay)} style={styles.card}>
      {children}
    </Animated.View>
  );
}

export function CardTitle({
  icon,
  title,
  accent,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  accent: string;
}) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <MaterialIcons color="#FFFFFF" name={icon} size={16} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F5FC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 110,
    gap: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#182031',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#5B6274',
    marginBottom: 8,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#182031',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2133',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#586078',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbA: {
    width: 260,
    height: 260,
    top: -100,
    right: -70,
    backgroundColor: '#CCD9FF',
  },
  orbB: {
    width: 220,
    height: 220,
    left: -80,
    bottom: 140,
    backgroundColor: '#DDF7EA',
  },
  floatingActionWrap: {
    position: 'absolute',
    right: 20,
    bottom: 96,
  },
});
