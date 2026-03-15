import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { Easing, FadeIn, FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';

import { formatTaskDateTime } from '@/components/app/task-date-utils';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useAppTheme } from '@/components/app/theme-context';
import { useTasks } from '@/components/app/tasks-context';

const COMPLETED_DROPDOWN_OPEN_MS = 260;
const COMPLETED_DROPDOWN_CLOSE_MS = 220;
const COMPLETED_OPEN_STAGGER_MS = 60;
const COMPLETED_CLOSE_STAGGER_MS = 95;

export default function TasksScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { tasks, categories, toggleTaskDone } = useTasks();
  const scrollRef = useRef<ScrollView | null>(null);
  const completedSectionY = useRef(0);
  const completedStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingCompletedToggle = useRef(false);
  const strikeAnim = useRef(new Animated.Value(0)).current;
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [pendingCompletedScroll, setPendingCompletedScroll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isHidingCompleted, setIsHidingCompleted] = useState(false);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(0);
  const [showCompletedHiddenHint, setShowCompletedHiddenHint] = useState(false);

  const doneCount = tasks.filter((task) => task.done).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.done), [tasks]);
  const visibleCompletedTasks = completedTasks.slice(0, visibleCompletedCount);
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const strikeWidth = strikeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  useEffect(() => {
    return () => {
      if (completedStepTimer.current) {
        clearTimeout(completedStepTimer.current);
        completedStepTimer.current = null;
      }
      isAnimatingCompletedToggle.current = false;
    };
  }, []);

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
  useEffect(() => {
    if (isAnimatingCompletedToggle.current) {
      return;
    }
    if (showCompleted) {
      setVisibleCompletedCount(completedTasks.length);
    } else {
      setVisibleCompletedCount((prev) => Math.min(prev, completedTasks.length));
    }
  }, [completedTasks.length, showCompleted]);

  const handleToggleTask = (taskId: string, taskDone: boolean) => {
    if (completingTaskId) {
      return;
    }

    if (taskDone) {
      toggleTaskDone(taskId);
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

      toggleTaskDone(taskId);
      setCompletingTaskId(null);
      setShowCompleted(true);
      setShowCompletedHiddenHint(false);
      setPendingCompletedScroll(true);
    });
  };
  const clearCompletedSequenceTimer = () => {
    if (completedStepTimer.current) {
      clearTimeout(completedStepTimer.current);
      completedStepTimer.current = null;
    }
    isAnimatingCompletedToggle.current = false;
  };
  const toggleCompletedVisibility = () => {
    clearCompletedSequenceTimer();

    if (showCompleted) {
      setIsHidingCompleted(true);
      setShowCompletedHiddenHint(false);
      const total = visibleCompletedCount;
      if (total <= 0) {
        setShowCompleted(false);
        setIsHidingCompleted(false);
        setShowCompletedHiddenHint(true);
        return;
      }
      isAnimatingCompletedToggle.current = true;
      const hideNext = () => {
        setVisibleCompletedCount((previous) => {
          const next = Math.max(0, previous - 1);
          if (next === 0) {
            isAnimatingCompletedToggle.current = false;
            setShowCompleted(false);
            setIsHidingCompleted(false);
            setShowCompletedHiddenHint(true);
          } else {
            completedStepTimer.current = setTimeout(hideNext, COMPLETED_CLOSE_STAGGER_MS);
          }
          return next;
        });
      };
      hideNext();
      return;
    }

    setShowCompleted(true);
    setIsHidingCompleted(false);
    setShowCompletedHiddenHint(false);
    const total = completedTasks.length;
    if (total <= 0) {
      setVisibleCompletedCount(0);
      return;
    }
    setVisibleCompletedCount(0);
    isAnimatingCompletedToggle.current = true;
    const showNext = (nextCount: number) => {
      setVisibleCompletedCount(nextCount);
      if (nextCount >= total) {
        isAnimatingCompletedToggle.current = false;
        return;
      }
      completedStepTimer.current = setTimeout(() => showNext(nextCount + 1), COMPLETED_OPEN_STAGGER_MS);
    };
    showNext(1);
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
              disabled={isAnimatingCompletedToggle.current}
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
          <View style={styles.completedBody}>
            {(showCompleted || isHidingCompleted) && visibleCompletedTasks.length > 0 ? (
              visibleCompletedTasks.map((task) => (
                <Reanimated.View
                  key={`completed-${task.id}`}
                  layout={LinearTransition.duration(220)}
                  entering={FadeInDown.duration(COMPLETED_DROPDOWN_OPEN_MS).easing(Easing.out(Easing.cubic))}
                  exiting={FadeOutDown.duration(COMPLETED_DROPDOWN_CLOSE_MS).easing(Easing.inOut(Easing.cubic))}>
                  {renderTaskItem(task, true)}
                </Reanimated.View>
              ))
            ) : showCompleted ? (
              <Text style={styles.emptyText}>Completed tasks will appear here.</Text>
            ) : showCompletedHiddenHint ? (
              <Reanimated.View entering={FadeIn.duration(170).easing(Easing.out(Easing.quad))}>
                <Text style={styles.completedCollapsedHint}>Completed tasks are hidden.</Text>
              </Reanimated.View>
            ) : null}
          </View>
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
