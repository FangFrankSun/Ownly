import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useAppTheme } from '@/components/app/theme-context';
import { AppIcon } from '@/components/ui/app-icon';

type ExerciseCategory = {
  id: string;
  label: string;
  icon: ComponentProps<typeof AppIcon>['name'];
};

type ExerciseTemplate = {
  id: string;
  categoryId: string;
  name: string;
  met: number;
};

type LoggedSession = {
  id: string;
  name: string;
  categoryId: string;
  durationMinutes: number;
  calories: number;
  metLabel: string;
  createdAt: number;
};

const DEFAULT_WEIGHT_KG = 70;
const DAILY_GOAL_KCAL = 650;

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  { id: 'walking', label: 'Walking', icon: 'directions-walk' },
  { id: 'running', label: 'Running', icon: 'directions-run' },
  { id: 'biking', label: 'Biking', icon: 'directions-bike' },
  { id: 'ball', label: 'Ball Games', icon: 'sports-basketball' },
  { id: 'water', label: 'Water Sports', icon: 'pool' },
  { id: 'other', label: 'Other Sports', icon: 'sports' },
  { id: 'gym', label: 'Gym Exercise', icon: 'fitness-center' },
  { id: 'aerobic', label: 'Aerobic Exercise', icon: 'favorite' },
  { id: 'dance', label: 'Dance', icon: 'music-note' },
];

const EXERCISE_LIBRARY: ExerciseTemplate[] = [
  { id: 'walk-slow', categoryId: 'walking', name: 'Slow walking (~3.2 km/h)', met: 2.8 },
  { id: 'walk-commute', categoryId: 'walking', name: 'Walking commute (moderate pace)', met: 3.5 },
  { id: 'walk-stroll', categoryId: 'walking', name: 'Leisure stroll (sanbu)', met: 2.5 },
  { id: 'walk-dog', categoryId: 'walking', name: 'Walking dogs', met: 3.0 },
  { id: 'walk-brisk', categoryId: 'walking', name: 'Brisk walking (~5.6 km/h)', met: 4.3 },
  { id: 'walk-fast', categoryId: 'walking', name: 'Fast walking (~6.4 km/h)', met: 5.0 },
  { id: 'walk-hills', categoryId: 'walking', name: 'Climbing hills / uphill walk', met: 6.0 },
  { id: 'walk-nordic', categoryId: 'walking', name: 'Nordic walking', met: 6.6 },

  { id: 'run-jog', categoryId: 'running', name: 'Jogging (~8 km/h)', met: 7.0 },
  { id: 'run-6mph', categoryId: 'running', name: 'Running (~9.7 km/h)', met: 9.8 },
  { id: 'run-7mph', categoryId: 'running', name: 'Running (~11.3 km/h)', met: 11.0 },
  { id: 'run-8mph', categoryId: 'running', name: 'Running (~12.9 km/h)', met: 11.8 },
  { id: 'run-9mph', categoryId: 'running', name: 'Running (~14.5 km/h)', met: 12.8 },
  { id: 'run-trail', categoryId: 'running', name: 'Trail running', met: 9.0 },
  { id: 'run-interval', categoryId: 'running', name: 'Interval/sprint training', met: 13.5 },

  { id: 'bike-lt16', categoryId: 'biking', name: 'Cycling <16 km/h (easy)', met: 4.0 },
  { id: 'bike-16-18', categoryId: 'biking', name: 'Cycling 16-18 km/h', met: 6.8 },
  { id: 'bike-19-22', categoryId: 'biking', name: 'Cycling 19-22 km/h', met: 8.0 },
  { id: 'bike-22-25', categoryId: 'biking', name: 'Cycling 22-25 km/h', met: 10.0 },
  { id: 'bike-25-30', categoryId: 'biking', name: 'Cycling 25-30 km/h', met: 12.0 },
  { id: 'bike-gt32', categoryId: 'biking', name: 'Cycling >32 km/h (race effort)', met: 15.8 },
  { id: 'bike-mtb', categoryId: 'biking', name: 'Mountain biking', met: 8.5 },
  { id: 'bike-commute', categoryId: 'biking', name: 'Bike commute mixed terrain', met: 6.0 },

  { id: 'ball-basket-shoot', categoryId: 'ball', name: 'Basketball shooting drills', met: 4.5 },
  { id: 'ball-basket-game', categoryId: 'ball', name: 'Basketball game', met: 8.0 },
  { id: 'ball-soccer-casual', categoryId: 'ball', name: 'Soccer casual play', met: 7.0 },
  { id: 'ball-soccer-match', categoryId: 'ball', name: 'Soccer match (competitive)', met: 10.0 },
  { id: 'ball-tennis-double', categoryId: 'ball', name: 'Tennis doubles', met: 5.0 },
  { id: 'ball-tennis-single', categoryId: 'ball', name: 'Tennis singles', met: 8.0 },
  { id: 'ball-volley-social', categoryId: 'ball', name: 'Volleyball social', met: 3.0 },
  { id: 'ball-volley-competitive', categoryId: 'ball', name: 'Volleyball competitive', met: 6.0 },
  { id: 'ball-baseball', categoryId: 'ball', name: 'Baseball or softball', met: 5.0 },
  { id: 'ball-table-tennis', categoryId: 'ball', name: 'Table tennis', met: 4.0 },

  { id: 'water-swim-leisure', categoryId: 'water', name: 'Swimming leisure', met: 6.0 },
  { id: 'water-swim-laps', categoryId: 'water', name: 'Swimming laps (moderate)', met: 8.3 },
  { id: 'water-swim-vigorous', categoryId: 'water', name: 'Swimming laps (vigorous)', met: 10.0 },
  { id: 'water-aerobics', categoryId: 'water', name: 'Water aerobics', met: 5.5 },
  { id: 'water-kayak', categoryId: 'water', name: 'Kayaking / paddling moderate', met: 5.0 },
  { id: 'water-rowing-open', categoryId: 'water', name: 'Rowing outdoor moderate', met: 7.0 },
  { id: 'water-surf', categoryId: 'water', name: 'Surfing', met: 3.0 },
  { id: 'water-scuba', categoryId: 'water', name: 'Scuba diving', met: 7.0 },

  { id: 'other-hike-moderate', categoryId: 'other', name: 'Hiking moderate trail', met: 6.0 },
  { id: 'other-hike-steep', categoryId: 'other', name: 'Hiking steep / loaded pack', met: 7.5 },
  { id: 'other-jumprope-mod', categoryId: 'other', name: 'Jump rope moderate', met: 10.0 },
  { id: 'other-jumprope-fast', categoryId: 'other', name: 'Jump rope fast', met: 12.3 },
  { id: 'other-martial', categoryId: 'other', name: 'Martial arts practice', met: 10.3 },
  { id: 'other-badminton', categoryId: 'other', name: 'Badminton recreational', met: 5.5 },
  { id: 'other-skateboard', categoryId: 'other', name: 'Skateboarding', met: 5.0 },
  { id: 'other-horseback', categoryId: 'other', name: 'Horseback riding', met: 5.5 },

  { id: 'gym-weights-light', categoryId: 'gym', name: 'Weight training light/moderate', met: 3.5 },
  { id: 'gym-weights-vigorous', categoryId: 'gym', name: 'Weight training vigorous', met: 6.0 },
  { id: 'gym-circuit', categoryId: 'gym', name: 'Circuit training', met: 8.0 },
  { id: 'gym-calisthenics', categoryId: 'gym', name: 'Bodyweight calisthenics', met: 5.0 },
  { id: 'gym-elliptical', categoryId: 'gym', name: 'Elliptical trainer moderate', met: 5.0 },
  { id: 'gym-rower', categoryId: 'gym', name: 'Rowing machine vigorous', met: 8.5 },
  { id: 'gym-stair', categoryId: 'gym', name: 'Stair machine', met: 8.8 },
  { id: 'gym-hiit', categoryId: 'gym', name: 'HIIT workout', met: 8.5 },

  { id: 'aerobic-low', categoryId: 'aerobic', name: 'Low-impact aerobics', met: 5.0 },
  { id: 'aerobic-high', categoryId: 'aerobic', name: 'High-impact aerobics', met: 7.3 },
  { id: 'aerobic-step-low', categoryId: 'aerobic', name: 'Step aerobics low', met: 6.5 },
  { id: 'aerobic-step-high', categoryId: 'aerobic', name: 'Step aerobics high', met: 8.5 },
  { id: 'aerobic-kickbox', categoryId: 'aerobic', name: 'Cardio kickboxing', met: 7.8 },
  { id: 'aerobic-bootcamp', categoryId: 'aerobic', name: 'Bootcamp intervals', met: 8.0 },
  { id: 'aerobic-trampoline', categoryId: 'aerobic', name: 'Cardio trampoline class', met: 6.0 },
  { id: 'aerobic-row', categoryId: 'aerobic', name: 'Cardio rowing intervals', met: 7.0 },

  { id: 'dance-social', categoryId: 'dance', name: 'Social dancing / slow dance', met: 3.0 },
  { id: 'dance-ballroom', categoryId: 'dance', name: 'Ballroom dance moderate', met: 4.5 },
  { id: 'dance-salsa', categoryId: 'dance', name: 'Salsa or bachata', met: 5.5 },
  { id: 'dance-hiphop', categoryId: 'dance', name: 'Hip-hop dance', met: 7.3 },
  { id: 'dance-zumba', categoryId: 'dance', name: 'Zumba / cardio dance', met: 7.5 },
  { id: 'dance-ballet', categoryId: 'dance', name: 'Ballet class', met: 5.0 },
  { id: 'dance-folk', categoryId: 'dance', name: 'Folk dance', met: 4.8 },
  { id: 'dance-contemporary', categoryId: 'dance', name: 'Contemporary dance vigorous', met: 6.8 },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function parsePositiveNumber(input: string, fallback: number) {
  const value = Number(input.trim());
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function caloriesPerHourFromMet(met: number, weightKg: number) {
  return Math.round(met * weightKg);
}

function caloriesForDuration(caloriesPerHour: number, durationMinutes: number) {
  return Math.round((caloriesPerHour * durationMinutes) / 60);
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

export default function ExerciseScreen() {
  const { theme } = useAppTheme();
  const [selectedCategoryId, setSelectedCategoryId] = useState(EXERCISE_CATEGORIES[0]?.id ?? 'walking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState(String(DEFAULT_WEIGHT_KG));
  const [durationInput, setDurationInput] = useState('30');
  const [customNameInput, setCustomNameInput] = useState('');
  const [customCaloriesInput, setCustomCaloriesInput] = useState('');
  const [sessions, setSessions] = useState<LoggedSession[]>([]);

  const selectedExercise = useMemo(
    () => EXERCISE_LIBRARY.find((item) => item.id === selectedExerciseId) ?? null,
    [selectedExerciseId]
  );

  const weightKg = parsePositiveNumber(weightInput, DEFAULT_WEIGHT_KG);
  const durationMinutes = Math.max(1, Math.round(parsePositiveNumber(durationInput, 30)));

  const filteredExercises = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((exercise) => {
      const categoryMatch = exercise.categoryId === selectedCategoryId;
      const searchMatch =
        normalized.length === 0 ||
        exercise.name.toLowerCase().includes(normalized) ||
        exercise.categoryId.toLowerCase().includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [searchQuery, selectedCategoryId]);

  const caloriesPerHour = selectedExercise
    ? caloriesPerHourFromMet(selectedExercise.met, weightKg)
    : Math.round(parsePositiveNumber(customCaloriesInput, 0));
  const previewCalories = caloriesPerHour > 0 ? caloriesForDuration(caloriesPerHour, durationMinutes) : 0;
  const canLogSession = previewCalories > 0 && durationMinutes > 0 && (selectedExercise || customNameInput.trim().length > 0);

  const todayKey = getTodayKey();
  const todaySessions = useMemo(
    () =>
      sessions.filter((session) => {
        const date = new Date(session.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return key === todayKey;
      }),
    [sessions, todayKey]
  );
  const todayTotalCalories = useMemo(
    () => todaySessions.reduce((sum, session) => sum + session.calories, 0),
    [todaySessions]
  );
  const goalPercent = Math.min(100, Math.round((todayTotalCalories / DAILY_GOAL_KCAL) * 100));

  const handleAddSession = () => {
    if (!canLogSession) {
      return;
    }

    const name = selectedExercise ? selectedExercise.name : customNameInput.trim();
    const metLabel = selectedExercise ? `MET ${selectedExercise.met.toFixed(1)}` : 'Custom kcal/h';
    const categoryId = selectedExercise?.categoryId ?? 'custom';

    const newSession: LoggedSession = {
      id: createId('session'),
      name,
      categoryId,
      durationMinutes,
      calories: previewCalories,
      metLabel,
      createdAt: Date.now(),
    };

    setSessions((previous) => [newSession, ...previous]);
    setDurationInput('30');
  };

  return (
    <ScreenShell title="Exercise" subtitle="Search activities, log duration, and track daily calories.">
      <AppCard delay={90}>
        <SectionLabel text="Daily Burn" />
        <CardTitle accent={theme.primary} icon="local-fire-department" title="Calories Burned Today" />
        <Text style={styles.bigNumber}>{todayTotalCalories} kcal</Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalText}>Goal: {DAILY_GOAL_KCAL} kcal</Text>
          <Text style={styles.goalText}>{goalPercent}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${goalPercent}%`, backgroundColor: theme.primary }]} />
        </View>
      </AppCard>

      <AppCard delay={130}>
        <SectionLabel text="Setup" />
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder="70"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>
        <Text style={styles.helperText}>Calories/hour are estimated from MET values at your entered body weight.</Text>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Exercise Library" />
        <View style={styles.searchRow}>
          <AppIcon color="#6B7491" name="search" size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercise..."
            placeholderTextColor="#8A93AB"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.categoryWrap}>
          {EXERCISE_CATEGORIES.map((category) => {
            const selected = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.categoryPill,
                  selected && { backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}66` },
                ]}>
                <AppIcon color={selected ? theme.primary : '#5A6586'} name={category.icon} size={16} />
                <Text style={[styles.categoryPillText, selected && { color: theme.primary }]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.exerciseList}>
          {filteredExercises.length === 0 ? (
            <Text style={styles.emptyText}>No activity matches this search in the selected category.</Text>
          ) : null}
          {filteredExercises.map((exercise) => {
            const selected = exercise.id === selectedExerciseId;
            const perHour = caloriesPerHourFromMet(exercise.met, weightKg);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  setSelectedExerciseId(exercise.id);
                  setCustomNameInput('');
                  setCustomCaloriesInput('');
                }}
                style={[
                  styles.exerciseRow,
                  selected && { borderColor: `${theme.primary}66`, backgroundColor: `${theme.primary}10` },
                ]}>
                <View style={styles.exerciseCopy}>
                  <Text style={[styles.exerciseName, selected && { color: theme.primary }]}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    MET {exercise.met.toFixed(1)} · ~{perHour} kcal/hour
                  </Text>
                </View>
                {selected ? <AppIcon color={theme.primary} name="check-circle" size={18} /> : null}
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard delay={200}>
        <SectionLabel text="Custom Exercise" />
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Exercise name</Text>
          <TextInput
            value={customNameInput}
            onChangeText={(value) => {
              setCustomNameInput(value);
              if (value.trim().length > 0) {
                setSelectedExerciseId(null);
              }
            }}
            placeholder="e.g. Pickleball drills"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Calories/hour</Text>
          <TextInput
            value={customCaloriesInput}
            onChangeText={(value) => {
              setCustomCaloriesInput(value);
              if (value.trim().length > 0) {
                setSelectedExerciseId(null);
              }
            }}
            keyboardType="number-pad"
            placeholder="e.g. 420"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>
      </AppCard>

      <AppCard delay={230}>
        <SectionLabel text="Log Session" />
        <View style={styles.sessionPreview}>
          <Text style={styles.previewLabel}>Selected</Text>
          <Text style={styles.previewName}>
            {selectedExercise ? selectedExercise.name : customNameInput.trim() || 'Select an exercise or enter custom'}
          </Text>
          <Text style={styles.previewMeta}>
            Estimated {caloriesPerHour > 0 ? caloriesPerHour : 0} kcal/hour
          </Text>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Duration (min)</Text>
          <TextInput
            value={durationInput}
            onChangeText={setDurationInput}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor="#8A93AB"
            style={styles.input}
          />
        </View>

        <View style={styles.logSummaryRow}>
          <Text style={styles.logSummaryText}>Session estimate</Text>
          <Text style={[styles.logSummaryText, styles.logSummaryStrong]}>{previewCalories} kcal</Text>
        </View>

        <Pressable
          disabled={!canLogSession}
          onPress={handleAddSession}
          style={[
            styles.logButton,
            { backgroundColor: canLogSession ? theme.primary : '#BCC4D9' },
          ]}>
          <Text style={styles.logButtonText}>Add Session</Text>
        </Pressable>
      </AppCard>

      <AppCard delay={260}>
        <SectionLabel text="Today Sessions" />
        {todaySessions.length === 0 ? <Text style={styles.emptyText}>No exercise logged today.</Text> : null}
        {todaySessions.map((session) => (
          <View key={session.id} style={styles.loggedRow}>
            <View style={styles.loggedCopy}>
              <Text style={styles.loggedName}>{session.name}</Text>
              <Text style={styles.loggedMeta}>
                {session.durationMinutes} min · {session.metLabel}
              </Text>
            </View>
            <Text style={[styles.loggedCalories, { color: theme.primary }]}>{session.calories} kcal</Text>
          </View>
        ))}
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
    backgroundColor: '#E4E9F6',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  inputRow: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B6583',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4DDEE',
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#1C2438',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#6E7896',
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4DDEE',
    backgroundColor: '#F7FAFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C2438',
    fontWeight: '600',
    paddingVertical: 2,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5EA',
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#465478',
  },
  exerciseList: {
    gap: 8,
  },
  exerciseRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D2DAEB',
    backgroundColor: '#F7F9FE',
    paddingVertical: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseCopy: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2133',
  },
  exerciseMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66708D',
  },
  sessionPreview: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5DDEE',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    color: '#68728F',
    fontWeight: '700',
  },
  previewName: {
    fontSize: 14,
    color: '#1A2133',
    fontWeight: '700',
  },
  previewMeta: {
    fontSize: 12,
    color: '#65708E',
    fontWeight: '600',
  },
  logSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logSummaryText: {
    fontSize: 13,
    color: '#5D6786',
    fontWeight: '600',
  },
  logSummaryStrong: {
    fontSize: 16,
    color: '#1A2133',
    fontWeight: '800',
  },
  logButton: {
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loggedRow: {
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    borderWidth: 1,
    borderColor: '#D2DAEB',
    paddingVertical: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loggedCopy: {
    flex: 1,
    gap: 2,
  },
  loggedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2133',
  },
  loggedMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#69728C',
  },
  loggedCalories: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    color: '#6D7793',
    lineHeight: 20,
    fontWeight: '600',
  },
});
