import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DesktopTasksView from '@/components/app/desktop-tasks-view';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import Reanimated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutDown,
  FadeOutRight,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { localizeTaskCategoryName } from '@/components/app/display-text';
import { formatTaskDateTime, formatTaskDuration } from '@/components/app/task-date-utils';
import { useLanguage } from '@/components/app/language-context';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useDesktopExperience } from '@/components/app/use-desktop-experience';
import { useAppTheme } from '@/components/app/theme-context';
import { useTasks } from '@/components/app/tasks-context';
import { AppIcon } from '@/components/ui/app-icon';

const COMPLETED_DROPDOWN_OPEN_MS = 260;
const COMPLETED_DROPDOWN_CLOSE_MS = 220;
const COMPLETED_OPEN_STAGGER_MS = 60;
const COMPLETED_CLOSE_STAGGER_MS = 95;

const PARTICLE_COUNT = 8;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i / PARTICLE_COUNT) * Math.PI * 2);

function CompletionParticle({ color, angle, delay: particleDelay }: { color: string; angle: number; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(particleDelay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [particleDelay, progress]);

  const particleStyle = useAnimatedStyle(() => {
    const distance = progress.value * 18;
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: 1 - progress.value * 0.6 },
      ],
    };
  });

  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          width: 5,
          height: 5,
          borderRadius: 99,
          backgroundColor: color,
        },
        particleStyle,
      ]}
    />
  );
}

function CompletionBurst({ color }: { color: string }) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    ring1.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    ring2.value = withDelay(80, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    ring3.value = withDelay(160, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    glow.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [glow, ring1, ring2, ring3]);

  const ringStyle = (progress: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: 1 - progress.value,
      transform: [{ scale: 1 + progress.value * 1.8 }],
    }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.35,
    transform: [{ scale: 1 + glow.value * 2.2 }],
  }));

  const ring1Style = ringStyle(ring1);
  const ring2Style = ringStyle(ring2);
  const ring3Style = ringStyle(ring3);

  return (
    <>
      <Reanimated.View
        style={[
          styles.burstRing,
          { borderColor: 'transparent', backgroundColor: color, borderWidth: 0 },
          glowStyle,
        ]}
      />
      <Reanimated.View style={[styles.burstRing, { borderColor: color }, ring1Style]} />
      <Reanimated.View style={[styles.burstRing, { borderColor: color }, ring2Style]} />
      <Reanimated.View style={[styles.burstRing, { borderColor: color }, ring3Style]} />
      {PARTICLE_ANGLES.map((angle, i) => (
        <CompletionParticle key={i} color={color} angle={angle} delay={i * 25} />
      ))}
    </>
  );
}

function AnimatedCheckbox({
  done,
  completing,
  color,
  onPress,
  disabled,
  title,
}: {
  done: boolean;
  completing: boolean;
  color: string;
  onPress: () => void;
  disabled: boolean;
  title: string;
}) {
  const checkScale = useSharedValue(done ? 1 : 0);
  const bounceScale = useSharedValue(1);
  const [showBurst, setShowBurst] = useState(false);
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      bounceScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
      checkScale.value = withSpring(1, { damping: 12, stiffness: 300 });
      setShowBurst(true);
      const timeout = setTimeout(() => setShowBurst(false), 600);
      prevDone.current = done;
      return () => clearTimeout(timeout);
    }
    if (!done && prevDone.current) {
      checkScale.value = withTiming(0, { duration: 150 });
      bounceScale.value = 1;
    }
    prevDone.current = done;
  }, [bounceScale, checkScale, done]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={`Mark ${title} as ${done ? 'not done' : 'done'}`}
      disabled={disabled}
      onPress={onPress}
      pressScale={0.85}
      style={styles.checkboxOuter}>
      <Reanimated.View
        style={[
          styles.check,
          done && { borderColor: color, backgroundColor: color },
          completing && { borderColor: color },
          containerStyle,
        ]}>
        <Reanimated.View style={checkmarkStyle}>
          <AppIcon color="#FFFFFF" name="check" size={14} />
        </Reanimated.View>
        {showBurst ? <CompletionBurst color={color} /> : null}
      </Reanimated.View>
    </AnimatedPressable>
  );
}

export default function TasksScreen() {
  const { isDesktopExperience } = useDesktopExperience();
  if (isDesktopExperience) {
    return <DesktopTasksView />;
  }

  return <MobileTasksScreen />;
}

function MobileTasksScreen() {
  const router = useRouter();
  const { effectiveLanguage, localeTag, t } = useLanguage();
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
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withTiming(progressPercent, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progressAnim, progressPercent]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));
  const activeTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.done), [tasks]);
  const visibleCompletedTasks = completedTasks.slice(0, visibleCompletedCount);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
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
      void toggleTaskDone(taskId);
      return;
    }

    setCompletingTaskId(taskId);
    strikeAnim.setValue(0);
    Animated.timing(strikeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        setCompletingTaskId(null);
        return;
      }

      void toggleTaskDone(taskId).then((result) => {
        setCompletingTaskId(null);
        if (!result.ok) {
          return;
        }

        setShowCompleted(true);
        setShowCompletedHiddenHint(false);
        setPendingCompletedScroll(true);
      });
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
    const category = categoryById.get(task.categoryId);
    const categoryName = localizeTaskCategoryName(
      category?.name ?? t('tasks.general'),
      effectiveLanguage
    );
    const categoryColor = category?.color ?? '#4C6FFF';
    const isCompleting = completingTaskId === task.id && !task.done;

    return (
      <View
        key={task.id}
        style={[
          styles.taskItem,
          inCompletedSection && styles.taskItemCompleted,
          inCompletedSection && { borderColor: `${theme.primary}22` },
        ]}>
        <AnimatedCheckbox
          done={task.done}
          completing={isCompleting}
          color={theme.primary}
          onPress={() => handleToggleTask(task.id, task.done)}
          disabled={Boolean(completingTaskId)}
          title={task.title}
        />

        <View style={styles.rowTextWrap}>
          <View style={styles.rowTitleRow}>
            <View style={styles.rowTitleWrap}>
              <Text style={[styles.rowTitle, task.done && styles.rowTitleDone]}>{task.title}</Text>
            </View>
            <View style={styles.rowTitleRight}>
              <Text style={styles.taskDurationText}>{formatTaskDuration(task.durationMinutes)}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}22`, borderColor: `${categoryColor}55` }]}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>{categoryName}</Text>
              </View>
            </View>
            {isCompleting ? (
              <Animated.View style={[styles.strikeLine, { width: strikeWidth, backgroundColor: theme.primary }]} />
            ) : null}
          </View>
          <View style={styles.rowMetaRow}>
            <Text style={[styles.rowSubtitle, task.done && styles.rowSubtitleDone]}>
              {formatTaskDateTime(task.scheduledAt, localeTag)}
              {task.repeatable ? ` · ${t('tasks.repeats')}` : ''}
            </Text>
          </View>
          {task.notes ? <Text style={[styles.notesText, task.done && styles.notesTextDone]}>{task.notes}</Text> : null}
        </View>

        <AnimatedPressable
          onPress={() => router.push({ pathname: '/task-editor', params: { taskId: task.id } })}
          pressScale={0.9}
          style={styles.editButton}>
          <AppIcon color="#3D4A72" name="edit" size={16} />
        </AnimatedPressable>
      </View>
    );
  };

  return (
    <ScreenShell
      scrollRef={scrollRef}
      title={t('tasks.title')}
      subtitle={t('tasks.subtitle')}
      floatingAction={
        <AnimatedPressable
          onPress={() => router.push('/task-editor')}
          pressScale={0.9}
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}>
          <AppIcon color="#FFFFFF" name="add" size={30} />
        </AnimatedPressable>
      }>
      <AppCard delay={90}>
        <SectionLabel text={t('tasks.progress')} />
        <CardTitle accent={theme.primary} icon="stars" title={t('tasks.focus')} />
        <Text style={styles.heroText}>
          {t('tasks.finished', { done: doneCount, total: tasks.length })}
        </Text>
        <View style={styles.progressTrack}>
          <Reanimated.View style={[styles.progressFill, { backgroundColor: theme.primary }, progressBarStyle]} />
        </View>
        <Text style={styles.metaText}>{t('tasks.completePercent', { percent: progressPercent })}</Text>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text={t('tasks.todo')} />
        {activeTasks.length === 0 ? <Text style={styles.emptyText}>{t('tasks.noActive')}</Text> : null}
        {activeTasks.map((task, index) => (
          <Reanimated.View
            key={`active-${task.id}`}
            entering={FadeInRight.delay(index * 50).duration(300).easing(Easing.out(Easing.cubic))}
            exiting={FadeOutRight.duration(200).easing(Easing.in(Easing.cubic))}
            layout={LinearTransition.duration(220)}>
            {renderTaskItem(task, false)}
          </Reanimated.View>
        ))}
      </AppCard>

      <View
        onLayout={(event) => {
          completedSectionY.current = event.nativeEvent.layout.y;
        }}>
        <AppCard delay={220}>
          <View style={styles.completedHeaderRow}>
            <SectionLabel text={t('tasks.completed')} />
            <AnimatedPressable
              disabled={isAnimatingCompletedToggle.current}
              onPress={toggleCompletedVisibility}
              style={[styles.completedToggleButton, { borderColor: `${theme.primary}33` }]}>
              <Text style={[styles.completedToggleText, { color: theme.primary }]}>
                {showCompleted ? t('common.hide') : t('common.show')} ({completedTasks.length})
              </Text>
              <AppIcon
                color={theme.primary}
                name={showCompleted ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
              />
            </AnimatedPressable>
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
              <Text style={styles.emptyText}>{t('tasks.noCompleted')}</Text>
            ) : showCompletedHiddenHint ? (
              <Reanimated.View entering={FadeIn.duration(170).easing(Easing.out(Easing.quad))}>
                <Text style={styles.completedCollapsedHint}>{t('tasks.completedHidden')}</Text>
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
  checkboxOuter: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    overflow: 'visible',
  },
  burstRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 99,
    borderWidth: 2,
  },
  rowTextWrap: {
    flex: 1,
    gap: 4,
  },
  rowTitleWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    minHeight: 22,
  },
  rowTitleRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitleRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '56%',
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
  rowMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#68708A',
  },
  rowSubtitleDone: {
    color: '#7B839C',
  },
  taskDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F6D8E',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  notesText: {
    fontSize: 12,
    color: '#7A829B',
    marginTop: 0,
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
