import { StyleSheet, Text, View } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';

export default function ExerciseScreen() {
  return (
    <ScreenShell title="Exercise" subtitle="Track movement and recovery.">
      <AppCard delay={90}>
        <SectionLabel text="Activity Ring" />
        <CardTitle accent="#FF7A59" icon="local-fire-department" title="Calories Burned" />
        <Text style={styles.bigNumber}>486 kcal</Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalText}>Goal: 650 kcal</Text>
          <Text style={styles.goalText}>75%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={styles.barFill} />
        </View>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Today Sessions" />
        <View style={styles.sessionRow}>
          <Text style={styles.sessionName}>Morning run</Text>
          <Text style={styles.sessionMeta}>32 min · 4.2 km</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionName}>Mobility stretch</Text>
          <Text style={styles.sessionMeta}>20 min · recovery</Text>
        </View>
      </AppCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  bigNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#1A2133',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalText: {
    fontSize: 13,
    color: '#626A82',
    fontWeight: '600',
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFE5DD',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    width: '75%',
    borderRadius: 999,
    backgroundColor: '#FF7A59',
  },
  sessionRow: {
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 3,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2133',
  },
  sessionMeta: {
    fontSize: 13,
    color: '#69738F',
  },
});
