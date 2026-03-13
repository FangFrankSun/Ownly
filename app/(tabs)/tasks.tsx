import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { formatTaskDateTime } from '@/components/app/task-date-utils';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useAppTheme } from '@/components/app/theme-context';
import { useTasks } from '@/components/app/tasks-context';

const COMPLETED_DROPDOWN_OPEN_MS = 320;
const COMPLETED_DROPDOWN_CLOSE_MS = 260;

export default function TasksScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { tasks, categories, toggleTaskDone } = useTasks();
  const scrollRef = useRef<ScrollView | null>(null);
  const completedSectionY = useRef(0);
  const strikeAnim = useRef(new Animated.Value(0)).current;
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [pendingCompletedScroll, setPendingCompletedScroll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const doneCount = tasks.filter((task) => task.done).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.done), [tasks]);
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const strikeWidth = strikeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  useEffect(() => {
    if (!pendingCompletedScroll || completedTasks.length === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, completedSectionY.current - 90),
        animated: true,
      });
      setPendingCompletedScroll(false);
    }, 220);

    return () => {
      clearTimeout(timeout);
    };
  }, [completedTasks.length, pendingCompletedScroll]);

  const toggleWithLayoutAnimation = (taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTaskDone(taskId);
  };

  const handleToggleTask = (taskId: string, taskDone: boolean) => {
    if (completingTaskId) {
      return;
    }

    if (taskDone) {
      toggleWithLayoutAnimation(taskId);
      return;
    }

    setCompletingTaskId(taskId);
    strikeAnim.setValue(0);
    Animated.timing(strikeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        setCompletingTaskId(null);
        return;
      }

      toggleWithLayoutAnimation(taskId);
      setCompletingTaskId(null);
      setShowCompleted(true);
      setPendingCompletedScroll(true);
    });
  };
  const toggleCompletedVisibility = () => {
    setShowCompleted((prev) => !prev);
  };

  const renderTaskItem = (task: (typeof tasks)[number], inCompletedSection: boolean) => {
    const categoryName = categoryNameById.get(task.categoryId) ?? 'General';
    const isCompleting = completingTaskId === task.id && !task.done;

    return (
      <View
        key={task.id}
        style={[
          styles.taskItem,
          inCompletedSection && styles.taskItemCompleted,
          inCompletedSection && { borderColor: `${theme.primary}22` },
        ]}>
        <Pressable
          accessibilityLabel={`${task.done ? 'Mark' : 'Mark'} ${task.title} as ${task.done ? 'not done' : 'done'}`}
          disabled={Boolean(completingTaskId)}
          onPress={() => handleToggleTask(task.id, task.done)}
          style={[
            styles.check,
            task.done && styles.checkOn,
            task.done && { borderColor: theme.primary, backgroundColor: theme.primary },
          ]}>
          {task.done ? <MaterialIcons color="#FFFFFF" name="check" size={14} /> : null}
        </Pressable>

        <View style={styles.rowTextWrap}>
          <View style={styles.rowTitleWrap}>
            <Text style={[styles.rowTitle, task.done && styles.rowTitleDone]}>{task.title}</Text>
            {isCompleting ? (
              <Animated.View style={[styles.strikeLine, { width: strikeWidth, backgroundColor: theme.primary }]} />
            ) : null}
          </View>
          <Text style={[styles.rowSubtitle, task.done && styles.rowSubtitleDone]}>
            {formatTaskDateTime(task.scheduledAt)} · {task.durationMinutes}m · {categoryName}
            {task.repeatable ? ' · Repeats' : ''}
          </Text>
          {task.notes ? <Text style={[styles.notesText, task.done && styles.notesTextDone]}>{task.notes}</Text> : null}
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/task-editor', params: { taskId: task.id } })}
          style={styles.editButton}>
          <MaterialIcons color="#3D4A72" name="edit" size={16} />
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenShell
      scrollRef={scrollRef}
      title="Tasks"
      subtitle="Track tasks and tap + to add a new one."
      floatingAction={
        <Pressable
          onPress={() => router.push('/task-editor')}
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}>
          <MaterialIcons color="#FFFFFF" name="add" size={30} />
        </Pressable>
      }>
      <AppCard delay={90}>
        <SectionLabel text="Progress" />
        <CardTitle accent={theme.primary} icon="stars" title="Today Focus" />
        <Text style={styles.heroText}>
          {doneCount} of {tasks.length} tasks finished
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={styles.metaText}>{progressPercent}% complete</Text>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="To-Do List" />
        {activeTasks.length === 0 ? <Text style={styles.emptyText}>No active tasks. Nice work.</Text> : null}
        {activeTasks.map((task) => renderTaskItem(task, false))}
      </AppCard>

      <View
        onLayout={(event) => {
          completedSectionY.current = event.nativeEvent.layout.y;
        }}>
        <AppCard delay={220}>
          <View style={styles.completedHeaderRow}>
            <SectionLabel text="Completed" />
            <Pressable
              onPress={toggleCompletedVisibility}
              style={[styles.completedToggleButton, { borderColor: `${theme.primary}33` }]}>
              <Text style={[styles.completedToggleText, { color: theme.primary }]}>
                {showCompleted ? 'Hide' : 'Show All'} ({completedTasks.length})
              </Text>
              <MaterialIcons
                color={theme.primary}
                name={showCompleted ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
              />
            </Pressable>
          </View>
          {showCompleted ? (
            <Reanimated.View
              entering={FadeInDown.duration(COMPLETED_DROPDOWN_OPEN_MS)}
              exiting={FadeOutUp.duration(COMPLETED_DROPDOWN_CLOSE_MS)}
              style={styles.completedBody}>
              {completedTasks.length === 0 ? (
                <Text style={styles.emptyText}>Completed tasks will appear here.</Text>
              ) : null}
              {completedTasks.map((task) => renderTaskItem(task, true))}
            </Reanimated.View>
          ) : (
            <Text style={styles.completedCollapsedHint}>Completed tasks are hidden.</Text>
          )}
        </AppCard>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#2F52D0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F52D0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  heroText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: '#1A2133',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E7ECF8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4361EE',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#586078',
  },
  emptyText: {
    fontSize: 14,
    color: '#6A738D',
    lineHeight: 21,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  completedToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F6F9FF',
  },
  completedToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completedCollapsedHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#707A95',
  },
  completedBody: {
    gap: 8,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    padding: 10,
  },
  taskItemCompleted: {
    backgroundColor: '#F2F5FC',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#D2D9EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F8FE',
  },
  checkOn: {
    borderColor: '#4361EE',
    backgroundColor: '#4361EE',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitleWrap: {
    position: 'relative',
    justifyContent: 'center',
    minHeight: 22,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2133',
  },
  rowTitleDone: {
    color: '#6A738E',
    textDecorationLine: 'line-through',
  },
  strikeLine: {
    position: 'absolute',
    left: 0,
    top: '52%',
    height: 2,
    borderRadius: 999,
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#68708A',
  },
  rowSubtitleDone: {
    color: '#7B839C',
  },
  notesText: {
    fontSize: 12,
    color: '#7A829B',
    marginTop: 2,
  },
  notesTextDone: {
    color: '#8A91A6',
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D3DBEF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
