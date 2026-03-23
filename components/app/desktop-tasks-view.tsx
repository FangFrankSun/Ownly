import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOut, LinearTransition } from 'react-native-reanimated';

import { localizeTaskCategoryName } from '@/components/app/display-text';
import { formatTaskDateTime, formatTaskDuration } from '@/components/app/task-date-utils';
import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { type TaskItem, useTasks } from '@/components/app/tasks-context';
import { AppIcon } from '@/components/ui/app-icon';
import { AnimatedPressable } from '@/components/ui/animated-pressable';

type ViewMode = 'list' | 'kanban';
type TaskSection = 'todo' | 'notes';
type GroupKey = 'overdue' | 'today' | 'next7' | 'completed';
type DraftState = {
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  durationMinutes: number;
  repeatable: boolean;
};
type QuickAddMonthCell = {
  key: string;
  date: Date;
  inMonth: boolean;
};

const GROUP_ORDER: GroupKey[] = ['overdue', 'today', 'next7', 'completed'];
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

function getNowDate() {
  return new Date();
}

function startOfDayMs(date = getNowDate()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfTomorrowMs(date = getNowDate()) {
  return startOfDayMs(date) + 24 * 60 * 60 * 1000;
}

function endOfSevenDaysMs(date = getNowDate()) {
  return startOfDayMs(date) + 7 * 24 * 60 * 60 * 1000;
}

function toTaskGroup(task: TaskItem, now = getNowDate()): GroupKey {
  if (task.done) return 'completed';
  const scheduledMs = new Date(task.scheduledAt).getTime();
  const todayStart = startOfDayMs(now);
  const tomorrowStart = startOfTomorrowMs(now);
  const sevenDayEnd = endOfSevenDaysMs(now);

  if (Number.isNaN(scheduledMs) || scheduledMs < todayStart) return 'overdue';
  if (scheduledMs < tomorrowStart) return 'today';
  if (scheduledMs < sevenDayEnd) return 'next7';
  return 'next7';
}

function parseTaskSection(rawSection: string | string[] | undefined): TaskSection {
  const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;
  if (section === 'notes') {
    return 'notes';
  }
  return 'todo';
}

function buildDraft(task: TaskItem): DraftState {
  return {
    title: task.title,
    notes: task.notes,
    categoryId: task.categoryId,
    scheduledAt: task.scheduledAt,
    durationMinutes: task.durationMinutes,
    repeatable: task.repeatable,
  };
}

function withDateOffset(base: Date, dayOffset: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString();
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date, localeTag: string) {
  return date.toLocaleDateString(localeTag, { month: 'short', year: 'numeric' });
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getMonthCells(monthDate: Date): QuickAddMonthCell[] {
  const first = startOfMonth(monthDate);
  const weekday = first.getDay();
  const gridStart = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: date.toISOString(),
      date,
      inMonth: sameMonth(date, monthDate),
    };
  });
}

export default function DesktopTasksView() {
  const { effectiveLanguage, localeTag } = useLanguage();
  const { theme } = useAppTheme();
  const { tasks, categories, addTask, updateTask, deleteTask, toggleTaskDone } = useTasks();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const section = parseTaskSection(params.section);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPanelOpen, setQuickAddPanelOpen] = useState(false);
  const [quickAddPanelTab, setQuickAddPanelTab] = useState<'date' | 'duration'>('date');
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(new Date());
  const [quickAddMonth, setQuickAddMonth] = useState<Date>(startOfMonth(new Date()));
  const [quickAddDurationMinutes, setQuickAddDurationMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [draft, setDraft] = useState<DraftState | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const filteredTasks = useMemo(() => {
    if (section === 'notes') {
      return tasks.filter((task) => task.notes.trim().length > 0);
    }
    return tasks;
  }, [section, tasks]);

  const groups = useMemo(() => {
    const next: Record<GroupKey, TaskItem[]> = {
      overdue: [],
      today: [],
      next7: [],
      completed: [],
    };
    for (const task of filteredTasks) {
      next[toTaskGroup(task)].push(task);
    }
    return next;
  }, [filteredTasks]);

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId]
  );

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId(null);
      return;
    }
    if (!selectedTaskId || !filteredTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setDraft(null);
      return;
    }
    setDraft(buildDraft(selectedTask));
  }, [selectedTask?.id, selectedTask]);

  const listTitle = useMemo(() => {
    return section === 'notes' ? 'Notes' : 'To do list';
  }, [section]);

  useEffect(() => {
    if (section === 'notes' && viewMode !== 'list') {
      setViewMode('list');
    }
  }, [section, viewMode]);

  const quickAddMonthCells = useMemo(() => getMonthCells(quickAddMonth), [quickAddMonth]);

  const quickAddDateLabel = useMemo(() => {
    if (!quickAddDate) {
      return 'No date';
    }
    return quickAddDate.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
  }, [localeTag, quickAddDate]);

  const submitQuickAdd = async () => {
    const title = quickAddTitle.trim();
    if (!title || !categories.length) return;
    setTaskError('');

    const now = getNowDate();
    const categoryId = categories[0].id;
    const scheduledAt = (() => {
      if (!quickAddDate) {
        return now.toISOString();
      }
      const date = new Date(quickAddDate);
      date.setHours(now.getHours(), now.getMinutes(), 0, 0);
      return date.toISOString();
    })();

    const result = await addTask({
      title,
      notes: section === 'notes' ? title : '',
      categoryId,
      scheduledAt,
      durationMinutes: quickAddDurationMinutes,
      repeatable: false,
    });

    if (!result.ok) {
      setTaskError(result.error);
      return;
    }

    setQuickAddTitle('');
    setQuickAddPanelOpen(false);
  };

  const applyDraft = async () => {
    if (!selectedTask || !draft) return;
    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      setTaskError('Task title is required.');
      return;
    }
    setSaving(true);
    setTaskError('');
    const result = await updateTask(selectedTask.id, {
      title: normalizedTitle,
      notes: draft.notes,
      categoryId: draft.categoryId,
      scheduledAt: draft.scheduledAt,
      durationMinutes: draft.durationMinutes,
      repeatable: draft.repeatable,
    });
    setSaving(false);
    if (!result.ok) {
      setTaskError(result.error);
    }
  };

  const removeSelected = async () => {
    if (!selectedTask) return;
    setDeleting(true);
    setTaskError('');
    const result = await deleteTask(selectedTask.id);
    setDeleting(false);
    if (!result.ok) {
      setTaskError(result.error);
      return;
    }
    setSelectedTaskId(null);
  };

  const renderTaskRow = (task: TaskItem, compact = false) => {
    const category = categoryMap.get(task.categoryId);
    const categoryColor = category?.color ?? theme.primary;
    const categoryName = localizeTaskCategoryName(category?.name ?? 'General', effectiveLanguage);
    const selected = task.id === selectedTaskId;

    return (
      <Animated.View
        key={task.id}
        entering={FadeInRight.duration(180)}
        layout={LinearTransition.duration(140)}>
        <AnimatedPressable
          onPress={() => setSelectedTaskId(task.id)}
          pressScale={0.99}
          style={[
            styles.taskRow,
            compact ? styles.taskRowCard : null,
            selected ? { borderColor: colorAlpha(theme.primary, 0.4), backgroundColor: colorAlpha(theme.primary, 0.08) } : null,
          ]}>
          <AnimatedPressable
            onPress={() => void toggleTaskDone(task.id)}
            pressScale={0.86}
            style={[
              styles.checkbox,
              task.done ? { borderColor: theme.primary, backgroundColor: theme.primary } : null,
            ]}>
            {task.done ? <AppIcon color="#FFFFFF" name="check" size={14} /> : null}
          </AnimatedPressable>
          <View style={styles.taskMain}>
            <View style={styles.taskTitleRow}>
              <Text numberOfLines={1} style={[styles.taskTitle, task.done ? styles.taskTitleDone : null]}>
                {task.title}
              </Text>
              <View style={styles.taskTitleRight}>
                <Text style={styles.taskDurationText}>{formatTaskDuration(task.durationMinutes)}</Text>
                <View style={[styles.categoryPill, { borderColor: colorAlpha(categoryColor, 0.38), backgroundColor: colorAlpha(categoryColor, 0.12) }]}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.categoryText, { color: categoryColor }]}>{categoryName}</Text>
                </View>
              </View>
            </View>
            <View style={styles.taskMetaRow}>
              <Text style={styles.taskMetaText}>
                {formatTaskDateTime(task.scheduledAt, localeTag)}
              </Text>
            </View>
            {task.notes ? <Text numberOfLines={compact ? 1 : 2} style={styles.taskNotes}>{task.notes}</Text> : null}
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.page, { backgroundColor: '#FFFFFF' }]}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{listTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTasks.length} {section === 'notes' ? 'notes' : 'tasks'}
          </Text>
        </View>
        {section === 'todo' ? (
          <View style={styles.modeToggle}>
            <ModeChip active={viewMode === 'list'} label="List" onPress={() => setViewMode('list')} />
            <ModeChip active={viewMode === 'kanban'} label="Kanban" onPress={() => setViewMode('kanban')} />
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.quickAddWrap}>
        <View style={[styles.addRow, { borderColor: colorAlpha(theme.primary, 0.25) }]}>
          <AppIcon color={colorAlpha(theme.primary, 0.76)} name="add" size={18} />
          <TextInput
            onChangeText={setQuickAddTitle}
            onSubmitEditing={() => void submitQuickAdd()}
            placeholder={section === 'notes' ? 'Add note' : `Add task to "${listTitle}"`}
            placeholderTextColor="#96A0B8"
            style={styles.addInput}
            value={quickAddTitle}
          />
          <AnimatedPressable
            onPress={() => setQuickAddPanelOpen((open) => !open)}
            pressScale={0.96}
            style={[
              styles.addMetaButton,
              quickAddPanelOpen ? { borderColor: colorAlpha(theme.primary, 0.45), backgroundColor: colorAlpha(theme.primary, 0.12) } : null,
            ]}>
            <AppIcon color={colorAlpha(theme.primary, 0.86)} name="calendar-month" size={16} />
            <Text numberOfLines={1} style={[styles.addMetaText, { color: colorAlpha(theme.primary, 0.86) }]}>
              {quickAddDateLabel} · {formatTaskDuration(quickAddDurationMinutes)}
            </Text>
            <AppIcon color={colorAlpha(theme.primary, 0.7)} name={quickAddPanelOpen ? 'expand-less' : 'expand-more'} size={18} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => void submitQuickAdd()} pressScale={0.95} style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.addButtonText}>Add</Text>
          </AnimatedPressable>
        </View>

        {quickAddPanelOpen ? (
          <>
            <Pressable onPress={() => setQuickAddPanelOpen(false)} style={styles.quickAddDismissLayer} />
            <Animated.View
              entering={FadeInDown.duration(170)}
              exiting={FadeOut.duration(120)}
              style={[styles.quickAddPanel, { borderColor: colorAlpha(theme.primary, 0.23), backgroundColor: '#FFFFFF' }]}>
              <View style={styles.quickAddTabRow}>
                <AnimatedPressable
                  onPress={() => setQuickAddPanelTab('date')}
                  pressScale={0.97}
                  style={[styles.quickAddTab, quickAddPanelTab === 'date' ? { backgroundColor: colorAlpha(theme.primary, 0.14) } : null]}>
                  <Text style={[styles.quickAddTabText, quickAddPanelTab === 'date' ? { color: colorAlpha(theme.primary, 0.98) } : null]}>Date</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => setQuickAddPanelTab('duration')}
                  pressScale={0.97}
                  style={[styles.quickAddTab, quickAddPanelTab === 'duration' ? { backgroundColor: colorAlpha(theme.primary, 0.14) } : null]}>
                  <Text style={[styles.quickAddTabText, quickAddPanelTab === 'duration' ? { color: colorAlpha(theme.primary, 0.98) } : null]}>Duration</Text>
                </AnimatedPressable>
              </View>

              {quickAddPanelTab === 'date' ? (
                <View style={styles.quickAddDatePane}>
                  <View style={styles.quickAddIconPresetRow}>
                    <QuickAddIconAction
                      icon="today"
                      label="Today"
                      onPress={() => {
                        const date = new Date();
                        setQuickAddDate(date);
                        setQuickAddMonth(startOfMonth(date));
                      }}
                    />
                    <QuickAddIconAction
                      icon="wb-sunny"
                      label="Tomorrow"
                      onPress={() => {
                        const date = addDays(new Date(), 1);
                        setQuickAddDate(date);
                        setQuickAddMonth(startOfMonth(date));
                      }}
                    />
                    <QuickAddIconAction
                      icon="event"
                      label="+7 days"
                      onPress={() => {
                        const date = addDays(new Date(), 7);
                        setQuickAddDate(date);
                        setQuickAddMonth(startOfMonth(date));
                      }}
                    />
                    <QuickAddIconAction icon="bedtime" label="No date" onPress={() => setQuickAddDate(null)} />
                  </View>

                  <View style={styles.quickAddMonthHeader}>
                    <Text style={styles.quickAddMonthLabel}>{monthLabel(quickAddMonth, localeTag)}</Text>
                    <View style={styles.quickAddMonthNav}>
                      <AnimatedPressable
                        onPress={() => setQuickAddMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        pressScale={0.92}
                        style={styles.quickAddMonthNavButton}>
                        <AppIcon color="#6E7893" name="chevron-left" size={18} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => setQuickAddMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        pressScale={0.92}
                        style={styles.quickAddMonthNavButton}>
                        <AppIcon color="#6E7893" name="chevron-right" size={18} />
                      </AnimatedPressable>
                    </View>
                  </View>

                  <View style={styles.quickAddWeekdayRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <Text key={`${day}-${index}`} style={styles.quickAddWeekdayText}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.quickAddCalendarGrid}>
                    {quickAddMonthCells.map((cell) => {
                      const selected = quickAddDate ? sameDay(cell.date, quickAddDate) : false;
                      return (
                        <AnimatedPressable
                          key={cell.key}
                          onPress={() => setQuickAddDate(cell.date)}
                          pressScale={0.92}
                          style={[
                            styles.quickAddDayButton,
                            selected ? { backgroundColor: colorAlpha(theme.primary, 0.2) } : null,
                          ]}>
                          <Text
                            style={[
                              styles.quickAddDayText,
                              !cell.inMonth ? styles.quickAddDayTextMuted : null,
                              selected ? { color: colorAlpha(theme.primary, 0.98), fontWeight: '700' } : null,
                            ]}>
                            {cell.date.getDate()}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.quickAddDurationPane}>
                  <Text style={styles.quickAddDurationTitle}>Task Duration</Text>
                  <View style={styles.quickAddDurationGrid}>
                    {DURATION_PRESETS.map((minutes) => (
                      <AnimatedPressable
                        key={`quick-add-duration-${minutes}`}
                        onPress={() => setQuickAddDurationMinutes(minutes)}
                        pressScale={0.94}
                        style={[
                          styles.quickAddDurationPill,
                          quickAddDurationMinutes === minutes ? { borderColor: colorAlpha(theme.primary, 0.45), backgroundColor: colorAlpha(theme.primary, 0.14) } : null,
                        ]}>
                        <Text
                          style={[
                            styles.quickAddDurationText,
                            quickAddDurationMinutes === minutes ? { color: colorAlpha(theme.primary, 0.96), fontWeight: '700' } : null,
                          ]}>
                          {minutes}m
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.quickAddPanelFooter}>
                <AnimatedPressable
                  onPress={() => {
                    setQuickAddDate(new Date());
                    setQuickAddMonth(startOfMonth(new Date()));
                    setQuickAddDurationMinutes(30);
                  }}
                  pressScale={0.96}
                  style={styles.quickAddClearButton}>
                  <Text style={styles.quickAddClearText}>Clear</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => setQuickAddPanelOpen(false)}
                  pressScale={0.96}
                  style={[styles.quickAddConfirmButton, { backgroundColor: theme.primary }]}>
                  <Text style={styles.quickAddConfirmText}>OK</Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          </>
        ) : null}
      </View>

      {taskError ? <Text style={styles.errorText}>{taskError}</Text> : null}

      <View style={styles.workspace}>
        <View style={[styles.mainPane, { borderRightColor: '#EAEFF7' }]}>
          {section === 'notes' ? (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>Notes</Text>
                  <Text style={styles.groupCount}>{filteredTasks.length}</Text>
                </View>
                {filteredTasks.length ? (
                  filteredTasks.map((task) => renderTaskRow(task))
                ) : (
                  <Text style={styles.groupEmpty}>No notes yet</Text>
                )}
              </View>
            </ScrollView>
          ) : viewMode === 'list' ? (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {GROUP_ORDER.map((groupKey) => (
                <View key={groupKey} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{groupLabel(groupKey)}</Text>
                    <Text style={styles.groupCount}>{groups[groupKey].length}</Text>
                  </View>
                  {groups[groupKey].length ? (
                    groups[groupKey].map((task) => renderTaskRow(task))
                  ) : (
                    <Text style={styles.groupEmpty}>No tasks</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.kanbanContent} horizontal showsHorizontalScrollIndicator={false}>
              {GROUP_ORDER.map((groupKey) => (
                <View key={`kanban-${groupKey}`} style={styles.kanbanColumn}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{groupLabel(groupKey)}</Text>
                    <Text style={styles.groupCount}>{groups[groupKey].length}</Text>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.kanbanStack}>
                      {groups[groupKey].length ? groups[groupKey].map((task) => renderTaskRow(task, true)) : <Text style={styles.groupEmpty}>No tasks</Text>}
                    </View>
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.detailPane}>
          {selectedTask && draft ? (
            <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailLabel}>Task</Text>
              <TextInput
                onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, title: value } : prev))}
                placeholder="Task title"
                placeholderTextColor="#98A3BB"
                style={styles.detailTitleInput}
                value={draft.title}
              />

              <Text style={styles.detailLabel}>Notes</Text>
              <TextInput
                multiline
                onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, notes: value } : prev))}
                placeholder="Write details..."
                placeholderTextColor="#98A3BB"
                style={styles.detailNotesInput}
                textAlignVertical="top"
                value={draft.notes}
              />

              <Text style={styles.detailLabel}>Schedule</Text>
              <View style={styles.pillRow}>
                <QuickPill label="Today" onPress={() => setDraft((prev) => (prev ? { ...prev, scheduledAt: new Date().toISOString() } : prev))} />
                <QuickPill label="Tomorrow" onPress={() => setDraft((prev) => (prev ? { ...prev, scheduledAt: withDateOffset(getNowDate(), 1) } : prev))} />
                <QuickPill label="+7 Days" onPress={() => setDraft((prev) => (prev ? { ...prev, scheduledAt: withDateOffset(getNowDate(), 7) } : prev))} />
              </View>
              <Text style={styles.scheduleValue}>{formatTaskDateTime(draft.scheduledAt, localeTag)}</Text>

              <Text style={styles.detailLabel}>Duration</Text>
              <View style={styles.pillRow}>
                {DURATION_PRESETS.map((minutes) => (
                  <QuickPill
                    key={`duration-${minutes}`}
                    active={draft.durationMinutes === minutes}
                    label={`${minutes}m`}
                    onPress={() => setDraft((prev) => (prev ? { ...prev, durationMinutes: minutes } : prev))}
                  />
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Repeatable</Text>
                <Switch
                  ios_backgroundColor="#CFD6E8"
                  onValueChange={(value) => setDraft((prev) => (prev ? { ...prev, repeatable: value } : prev))}
                  trackColor={{ false: '#D5DDEF', true: colorAlpha(theme.primary, 0.45) }}
                  value={draft.repeatable}
                />
              </View>

              <Text style={styles.detailLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => {
                  const selected = draft.categoryId === category.id;
                  return (
                    <AnimatedPressable
                      key={category.id}
                      onPress={() => setDraft((prev) => (prev ? { ...prev, categoryId: category.id } : prev))}
                      pressScale={0.96}
                      style={[
                        styles.categoryChip,
                        selected ? { borderColor: category.color, backgroundColor: colorAlpha(category.color, 0.14) } : null,
                      ]}>
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <Text style={[styles.categoryChipText, selected ? { color: '#17223E' } : null]}>
                        {localizeTaskCategoryName(category.name, effectiveLanguage)}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <View style={styles.detailActions}>
                <AnimatedPressable
                  disabled={saving}
                  onPress={() => void applyDraft()}
                  pressScale={0.95}
                  style={[styles.primaryAction, { backgroundColor: theme.primary }]}>
                  <Text style={styles.primaryActionText}>{saving ? 'Saving...' : 'Save'}</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  disabled={deleting}
                  onPress={() => void removeSelected()}
                  pressScale={0.95}
                  style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
                </AnimatedPressable>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyDetail}>
              <AppIcon color="#8A96B0" name="description" size={42} />
              <Text style={styles.emptyDetailTitle}>Select a task</Text>
              <Text style={styles.emptyDetailSubtitle}>Task details and editing tools appear here.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function groupLabel(groupKey: GroupKey) {
  if (groupKey === 'overdue') return 'Overdue';
  if (groupKey === 'today') return 'Today';
  if (groupKey === 'next7') return 'Next 7 Days';
  return 'Completed';
}

function colorAlpha(color: string, alpha: number) {
  const clamped = Math.max(0, Math.min(1, alpha));
  if (color.startsWith('#') && color.length === 7) {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    if (![r, g, b].some((value) => Number.isNaN(value))) {
      return `rgba(${r}, ${g}, ${b}, ${clamped})`;
    }
  }
  return color;
}

function ModeChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.97}
      style={[styles.modeChip, active ? styles.modeChipActive : null]}>
      <Text style={[styles.modeChipText, active ? styles.modeChipTextActive : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

function QuickPill({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <AnimatedPressable onPress={onPress} pressScale={0.95} style={[styles.quickPill, active ? styles.quickPillActive : null]}>
      <Text style={[styles.quickPillText, active ? styles.quickPillTextActive : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

function QuickAddIconAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} pressScale={0.94} style={styles.quickAddIconPreset}>
      <AppIcon color="#62708F" name={icon} size={18} />
      <Text style={styles.quickAddIconPresetText}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    color: '#1F2332',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '400',
    color: '#7F889E',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DFEF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeChipActive: {
    borderColor: '#9EABC9',
    backgroundColor: '#EEF2FA',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607091',
  },
  modeChipTextActive: {
    color: '#223156',
  },
  addRow: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFF',
  },
  quickAddWrap: {
    position: 'relative',
    zIndex: 30,
  },
  addInput: {
    flex: 1,
    color: '#212B44',
    fontSize: 15,
    fontWeight: '500',
  },
  addMetaButton: {
    maxWidth: 240,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D2DBEE',
    paddingHorizontal: 8,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  addMetaText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  addButton: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAddDismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: -3000,
    zIndex: 45,
  },
  quickAddPanel: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 360,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
    shadowColor: '#1A2338',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 22,
    zIndex: 60,
  },
  quickAddTabRow: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DEE5F4',
    padding: 4,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F6F8FD',
  },
  quickAddTab: {
    flex: 1,
    minHeight: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7E88A0',
  },
  quickAddDatePane: {
    gap: 10,
  },
  quickAddIconPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddIconPreset: {
    flex: 1,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E6F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FBFCFF',
  },
  quickAddIconPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667391',
  },
  quickAddMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickAddMonthLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: '#253153',
  },
  quickAddMonthNav: {
    flexDirection: 'row',
    gap: 6,
  },
  quickAddMonthNavButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE4F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  quickAddWeekdayRow: {
    flexDirection: 'row',
  },
  quickAddWeekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#8A95AD',
  },
  quickAddCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickAddDayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddDayText: {
    fontSize: 14,
    color: '#36415F',
    fontWeight: '500',
  },
  quickAddDayTextMuted: {
    color: '#A1ABBF',
  },
  quickAddDurationPane: {
    minHeight: 220,
    gap: 10,
  },
  quickAddDurationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344062',
  },
  quickAddDurationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddDurationPill: {
    minWidth: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE4F3',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FBFF',
  },
  quickAddDurationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64708D',
  },
  quickAddPanelFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  quickAddClearButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DDE4F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddClearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#687492',
  },
  quickAddConfirmButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#B7364C',
    fontSize: 12,
    fontWeight: '600',
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    borderWidth: 1,
    borderColor: '#E7ECF7',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mainPane: {
    flex: 1.9,
    borderRightWidth: 1,
    minWidth: 0,
  },
  listContent: {
    padding: 12,
    gap: 14,
  },
  groupSection: {
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    minHeight: 22,
  },
  groupTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1D263C',
    letterSpacing: -0.2,
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B94AA',
  },
  groupEmpty: {
    marginLeft: 6,
    fontSize: 13,
    color: '#8D97AF',
  },
  taskRow: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAF5',
    backgroundColor: '#FCFDFF',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskRowCard: {
    minHeight: 84,
  },
  checkbox: {
    marginTop: 5,
    width: 22,
    height: 22,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#CAD3E7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitleRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '58%',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
    color: '#1B253C',
    letterSpacing: -0.2,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#8691AA',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskMetaText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#7C87A2',
  },
  taskDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F6D8E',
  },
  taskNotes: {
    fontSize: 12,
    lineHeight: 16,
    color: '#66708D',
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kanbanContent: {
    padding: 12,
    gap: 12,
  },
  kanbanColumn: {
    width: 342,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7ECF7',
    padding: 10,
    gap: 8,
    backgroundColor: '#FBFCFF',
  },
  kanbanStack: {
    gap: 8,
    paddingBottom: 16,
  },
  detailPane: {
    flex: 1.1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
  },
  detailContent: {
    padding: 14,
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#8793AF',
  },
  detailTitleInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 11,
    color: '#18233D',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: '#FBFCFF',
  },
  detailNotesInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: '#273251',
    fontSize: 14,
    backgroundColor: '#FBFCFF',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E0F1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickPillActive: {
    borderColor: '#8FA2C8',
    backgroundColor: '#EEF2FA',
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B6786',
  },
  quickPillTextActive: {
    color: '#24345A',
  },
  scheduleValue: {
    fontSize: 12,
    color: '#6C7792',
    fontWeight: '600',
  },
  switchRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#243050',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E0F1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B6786',
  },
  detailActions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8DEEE',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    color: '#5E6987',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyDetail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A3551',
  },
  emptyDetailSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: '#77829F',
  },
});
