import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatTaskDateTime,
  isValidIsoDate,
  toIsoWithDateAndTime,
} from '@/components/app/task-date-utils';
import { localizeTaskCategoryName } from '@/components/app/display-text';
import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { useTasks } from '@/components/app/tasks-context';
import { AppIcon } from '@/components/ui/app-icon';

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const h = hue / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
  } else if (h >= 1 && h < 2) {
    r = x;
    g = c;
  } else if (h >= 2 && h < 3) {
    g = c;
    b = x;
  } else if (h >= 3 && h < 4) {
    g = x;
    b = c;
  } else if (h >= 4 && h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0').toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const PALETTE_COLUMN_PROFILE: { hue: number; saturation: number; kind: 'color' | 'neutral' }[] = [
  { hue: 352, saturation: 90, kind: 'color' },
  { hue: 320, saturation: 72, kind: 'color' },
  { hue: 280, saturation: 56, kind: 'color' },
  { hue: 236, saturation: 44, kind: 'color' },
  { hue: 204, saturation: 58, kind: 'color' },
  { hue: 186, saturation: 64, kind: 'color' },
  { hue: 162, saturation: 66, kind: 'color' },
  { hue: 116, saturation: 46, kind: 'color' },
  { hue: 82, saturation: 56, kind: 'color' },
  { hue: 54, saturation: 76, kind: 'color' },
  { hue: 35, saturation: 86, kind: 'color' },
  { hue: 15, saturation: 86, kind: 'color' },
  { hue: 4, saturation: 84, kind: 'color' },
  { hue: 25, saturation: 14, kind: 'neutral' },
  { hue: 0, saturation: 0, kind: 'neutral' },
  { hue: 202, saturation: 24, kind: 'neutral' },
];
const PALETTE_SHADE_LIGHTNESS = [88, 78, 69, 60, 51, 43, 35, 27, 20];
const PALETTE_COLUMNS = PALETTE_COLUMN_PROFILE.length;
const PALETTE_ROWS = PALETTE_SHADE_LIGHTNESS.length;
const PALETTE_SWATCH_SELECTED_RADIUS = 4;
const PALETTE_SWATCH_OVERFLOW_GUTTER = 4;
const PALETTE_SCALE_STAGE = 1.1;
const PALETTE_SCALE_SELECTED = 1.2;
const PALETTE_ANIMATION_STAGE_MS = 120;

function buildSpectrumColors() {
  const colors: string[] = [];
  for (let row = 0; row < PALETTE_ROWS; row += 1) {
    const lightness = PALETTE_SHADE_LIGHTNESS[row] ?? 50;

    for (let col = 0; col < PALETTE_COLUMNS; col += 1) {
      const column = PALETTE_COLUMN_PROFILE[col];
      const rowBoost = column.kind === 'color' ? -7 + row * 2 : -2 + row;
      const saturation = Math.max(0, Math.min(96, column.saturation + rowBoost));
      colors.push(hslToHex(column.hue, saturation, lightness));
    }
  }

  return colors;
}

const SPECTRUM_COLORS = buildSpectrumColors();
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

function buildDateOptions(days = 21) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildTimeOptions(localeTag: string) {
  const options: { key: string; hour: number; minute: number; label: string }[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const key = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const display = new Date();
      display.setHours(hour, minute, 0, 0);

      options.push({
        key,
        hour,
        minute,
        label: display.toLocaleTimeString(localeTag, { hour: 'numeric', minute: '2-digit' }),
      });
    }
  }

  return options;
}

function formatManualTime(hour: number, minute: number) {
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function parseManualTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function normalizeHexColor(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const candidate = normalized.startsWith('#') ? normalized : `#${normalized}`;
  if (!/^#[0-9A-F]{6}$/.test(candidate)) {
    return null;
  }
  return candidate;
}

type PaletteSwatchProps = {
  color: string;
  selected: boolean;
  size: number;
  onPress: () => void;
};

function PaletteSwatch({ color, selected, size, onPress }: PaletteSwatchProps) {
  const scale = useSharedValue(selected ? PALETTE_SCALE_SELECTED : 1);
  const radius = useSharedValue(selected ? PALETTE_SWATCH_SELECTED_RADIUS : 0);
  const lifted = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (selected) {
      lifted.value = 1;
      scale.value = withSequence(
        withTiming(PALETTE_SCALE_STAGE, { duration: PALETTE_ANIMATION_STAGE_MS }),
        withTiming(PALETTE_SCALE_SELECTED, { duration: PALETTE_ANIMATION_STAGE_MS })
      );
      radius.value = withSequence(
        withTiming(0, { duration: PALETTE_ANIMATION_STAGE_MS }),
        withTiming(PALETTE_SWATCH_SELECTED_RADIUS, { duration: PALETTE_ANIMATION_STAGE_MS })
      );
      return;
    }

    // Keep above siblings until the full return animation finishes.
    lifted.value = 1;
    scale.value = withSequence(
      withTiming(PALETTE_SCALE_STAGE, { duration: PALETTE_ANIMATION_STAGE_MS }),
      withTiming(1, { duration: PALETTE_ANIMATION_STAGE_MS })
    );
    radius.value = withTiming(0, { duration: PALETTE_ANIMATION_STAGE_MS });
    lifted.value = withDelay(PALETTE_ANIMATION_STAGE_MS * 2, withTiming(0, { duration: 0 }));
  }, [lifted, radius, scale, selected]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    zIndex: lifted.value > 0 ? 240 : 1,
    elevation: lifted.value > 0 ? 12 : 0,
  }));

  const animatedSwatchStyle = useAnimatedStyle(() => {
    const scaledSize = size * scale.value;

    return {
      width: scaledSize,
      height: scaledSize,
      borderRadius: radius.value,
    };
  });

  return (
    <Animated.View style={[styles.paletteSwatchPress, { width: size, height: size }, animatedPressStyle]}>
      <Pressable onPress={onPress} style={styles.paletteSwatchHitbox}>
        <Animated.View style={[styles.paletteSwatch, { backgroundColor: color }, animatedSwatchStyle]} />
      </Pressable>
    </Animated.View>
  );
}

export default function TaskEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { effectiveLanguage, localeTag, t } = useLanguage();
  const { theme } = useAppTheme();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { tasks, categories, addTask, updateTask, deleteTask, addCategory, updateCategoryColor, deleteCategory } =
    useTasks();

  const isEditing = typeof taskId === 'string' && taskId.length > 0;
  const isPhoneLayout = Platform.OS !== 'web';
  const editingTask = useMemo(
    () => (isEditing ? tasks.find((task) => task.id === taskId) : undefined),
    [isEditing, taskId, tasks]
  );

  const defaultCategoryId = categories[0]?.id ?? '';
  const initialSchedule = editingTask?.scheduledAt ?? new Date().toISOString();

  const [title, setTitle] = useState(editingTask?.title ?? '');
  const [notes, setNotes] = useState(editingTask?.notes ?? '');
  const [categoryId, setCategoryId] = useState(editingTask?.categoryId ?? defaultCategoryId);
  const [scheduledAt, setScheduledAt] = useState(initialSchedule);
  const [durationMinutes, setDurationMinutes] = useState(editingTask?.durationMinutes ?? 60);
  const [repeatable, setRepeatable] = useState(editingTask?.repeatable ?? false);
  const [error, setError] = useState('');

  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [paletteColor, setPaletteColor] = useState(theme.primary);
  const [paletteHexInput, setPaletteHexInput] = useState(theme.primary);
  const [paletteError, setPaletteError] = useState('');
  const [paletteGridWidth, setPaletteGridWidth] = useState(0);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number | null>(() => {
    const index = SPECTRUM_COLORS.indexOf(theme.primary);
    return index >= 0 ? index : null;
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date(initialSchedule));
  const [pickerHour, setPickerHour] = useState(new Date(initialSchedule).getHours());
  const [pickerMinute, setPickerMinute] = useState(new Date(initialSchedule).getMinutes() >= 30 ? 30 : 0);
  const [manualTime, setManualTime] = useState(() =>
    formatManualTime(new Date(initialSchedule).getHours(), new Date(initialSchedule).getMinutes())
  );
  const [durationInput, setDurationInput] = useState(String(editingTask?.durationMinutes ?? 60));
  const [pickerError, setPickerError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const timeOptions = useMemo(() => buildTimeOptions(localeTag), [localeTag]);
  const paletteSwatchSize = useMemo(() => {
    if (paletteGridWidth <= 0) {
      return 18;
    }
    return Math.max(14, Math.floor(paletteGridWidth / PALETTE_COLUMNS));
  }, [paletteGridWidth]);
  const paletteGridInnerWidth = paletteSwatchSize * PALETTE_COLUMNS;

  const openPicker = () => {
    const current = isValidIsoDate(scheduledAt) ? new Date(scheduledAt) : new Date();
    setPickerDate(current);
    setPickerHour(current.getHours());
    setPickerMinute(current.getMinutes() >= 30 ? 30 : 0);
    setManualTime(formatManualTime(current.getHours(), current.getMinutes()));
    setDurationInput(String(durationMinutes));
    setPickerError('');
    setPickerOpen(true);
  };

  const applyPicker = () => {
    const parsed = parseManualTime(manualTime);
    if (!parsed) {
      setPickerError(t('taskEditor.use24HourError'));
      return;
    }

    const parsedDuration = Number(durationInput.trim());
    if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 24 * 60) {
      setPickerError(t('taskEditor.durationRangeError'));
      return;
    }

    const normalizedDuration = Math.round(parsedDuration);
    setPickerHour(parsed.hour);
    setPickerMinute(parsed.minute);
    setScheduledAt(toIsoWithDateAndTime(pickerDate, parsed.hour, parsed.minute));
    setDurationMinutes(normalizedDuration);
    setDurationInput(String(normalizedDuration));
    setPickerError('');
    setPickerOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      setError(t('taskEditor.categoryNameRequired'));
      return;
    }

    const newId = addCategory(newCategoryName, theme.primary);
    setCategoryId(newId);
    setNewCategoryName('');
    setError('');
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      setError(t('taskEditor.atLeastOneCategory'));
      return;
    }

    if (id === categoryId) {
      const fallback = categories.find((category) => category.id !== id);
      if (fallback) {
        setCategoryId(fallback.id);
      }
    }

    deleteCategory(id);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError(t('taskEditor.taskTitleRequired'));
      return;
    }

    if (!categoryId) {
      setError(t('taskEditor.selectCategory'));
      return;
    }

    if (!isValidIsoDate(scheduledAt)) {
      setError(t('taskEditor.validDateTime'));
      return;
    }

    const payload = {
      title,
      notes,
      categoryId,
      scheduledAt,
      durationMinutes,
      repeatable,
    };

    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }

    router.back();
  };

  const openCategoryColorPicker = (categoryIdToEdit: string, currentColor: string) => {
    const paletteIndex = SPECTRUM_COLORS.indexOf(currentColor);
    setEditingCategoryId(categoryIdToEdit);
    setPaletteColor(currentColor);
    setPaletteHexInput(currentColor);
    setSelectedPaletteIndex(paletteIndex >= 0 ? paletteIndex : null);
    setPaletteError('');
    setColorPaletteOpen(true);
  };

  const closeCategoryColorPicker = () => {
    setColorPaletteOpen(false);
    setEditingCategoryId(null);
    setPaletteError('');
  };

  const handleSaveCategoryColor = () => {
    if (!editingCategoryId) {
      closeCategoryColorPicker();
      return;
    }

    const normalized = normalizeHexColor(paletteHexInput);
    if (!normalized) {
      setPaletteError(t('taskEditor.validHexColor'));
      return;
    }

    updateCategoryColor(editingCategoryId, normalized);
    closeCategoryColorPicker();
  };
  const handleDeleteTask = () => {
    if (!editingTask) {
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = () => {
    if (!editingTask) {
      setDeleteConfirmOpen(false);
      return;
    }
    deleteTask(editingTask.id);
    setDeleteConfirmOpen(false);
    router.back();
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.pageBackground }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        style={styles.editorKeyboardAvoiding}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(40, insets.top + 16),
              paddingBottom: Math.max(42, insets.bottom + (isPhoneLayout ? 32 : 8)),
            },
          ]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <AppIcon color="#4A5576" name="close" size={22} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{editingTask ? t('taskEditor.titleEdit') : t('taskEditor.titleCreate')}</Text>
              <Text style={styles.headerSubtitle}>{t('taskEditor.subtitle')}</Text>
            </View>
            {editingTask ? (
              <Pressable onPress={handleDeleteTask} style={styles.deleteTopButton}>
                <AppIcon color="#C7364A" name="delete-outline" size={19} />
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeadingRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: `${theme.primary}18` }]}>
                <AppIcon color={theme.primary} name="edit-note" size={16} />
              </View>
              <Text style={styles.sectionTitle}>{t('taskEditor.sectionDetails')}</Text>
            </View>
            <Text style={styles.inputLabel}>{t('taskEditor.labelTitle')}</Text>
            <TextInput
              onChangeText={setTitle}
              placeholder={t('taskEditor.placeholderTitle')}
              placeholderTextColor="#8E96AC"
              style={styles.input}
              value={title}
            />
            <Text style={styles.inputLabel}>{t('taskEditor.labelNotes')}</Text>
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder={t('taskEditor.placeholderNotes')}
              placeholderTextColor="#8E96AC"
              style={[styles.input, styles.notesInput]}
              value={notes}
            />
            <Text style={styles.inputLabel}>{t('taskEditor.labelDateDuration')}</Text>
            <Pressable onPress={openPicker} style={styles.pickerButton}>
              <View style={[styles.pickerIconBadge, { backgroundColor: `${theme.primary}20` }]}>
                <AppIcon color={theme.primary} name="event" size={17} />
              </View>
              <View style={styles.pickerTextBlock}>
                <Text style={styles.pickerText}>{formatTaskDateTime(scheduledAt, localeTag)}</Text>
                <Text style={styles.pickerSubtext}>{t('common.minutesLong', { minutes: durationMinutes })}</Text>
              </View>
              <AppIcon color="#6A7798" name="chevron-right" size={20} />
            </Pressable>
            <View style={styles.repeatRow}>
              <View style={styles.repeatTextBlock}>
                <Text style={styles.repeatLabel}>{t('taskEditor.repeatLabel')}</Text>
                <Text style={styles.repeatSubtext}>{t('taskEditor.repeatSubtext')}</Text>
              </View>
              <Switch
                ios_backgroundColor="#CCD3E3"
                onValueChange={setRepeatable}
                thumbColor={repeatable ? theme.primary : '#F3F5FB'}
                trackColor={{ false: '#CCD3E3', true: `${theme.primary}66` }}
                value={repeatable}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeadingRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: `${theme.primary}18` }]}>
                <AppIcon color={theme.primary} name="category" size={16} />
              </View>
              <Text style={styles.sectionTitle}>{t('taskEditor.sectionCategories')}</Text>
              <View style={styles.sectionHeadingSpacer} />
              <Pressable onPress={() => setCategoryEditMode((prev) => !prev)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>{categoryEditMode ? t('common.done') : t('common.edit')}</Text>
              </Pressable>
            </View>
            <View style={styles.categoryList}>
              {categories.map((category) => {
                const selected = category.id === categoryId;

                return (
                  <View key={category.id} style={styles.categoryRow}>
                    <Pressable
                      onPress={() => setCategoryId(category.id)}
                      style={[
                        styles.categoryChip,
                        selected && {
                          borderColor: category.color,
                          backgroundColor: `${category.color}14`,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && {
                            color: category.color,
                          },
                        ]}>
                        {localizeTaskCategoryName(category.name, effectiveLanguage)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openCategoryColorPicker(category.id, category.color)}
                      style={styles.categoryColorButton}>
                      <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
                    </Pressable>
                    {categoryEditMode ? (
                      <Pressable onPress={() => handleDeleteCategory(category.id)} style={styles.deleteCategoryButton}>
                        <AppIcon color="#C7364A" name="delete-outline" size={18} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>{t('taskEditor.newCategory')}</Text>
            <TextInput
              onChangeText={setNewCategoryName}
              placeholder={t('taskEditor.placeholderNewCategory')}
              placeholderTextColor="#8E96AC"
              style={styles.input}
              value={newCategoryName}
            />
            <Pressable onPress={handleCreateCategory} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('taskEditor.addCategory')}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSave}
            style={[styles.primaryButton, { backgroundColor: theme.primary, borderColor: `${theme.primary}99` }]}>
            <Text style={styles.primaryButtonText}>{editingTask ? t('taskEditor.saveChanges') : t('taskEditor.createTask')}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal animationType="fade" transparent visible={pickerOpen}>
        <View style={[styles.modalBackdrop, isPhoneLayout && styles.modalBackdropMobile]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 0}
            style={[styles.modalKeyboardAvoiding, isPhoneLayout && styles.modalKeyboardAvoidingMobile]}>
            <View style={[styles.modalCard, isPhoneLayout && styles.modalCardMobile]}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.modalCardScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalCardScroll}>
                {isPhoneLayout ? <View style={styles.sheetGrabber} /> : null}
                <Text style={styles.modalTitle}>{t('taskEditor.chooseDateTime')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
                  {dateOptions.map((dateOption) => {
                    const selected = dateOption.toDateString() === pickerDate.toDateString();
                    return (
                      <Pressable
                        key={dateOption.toISOString()}
                        onPress={() => setPickerDate(dateOption)}
                        style={[
                          styles.datePill,
                          selected && styles.datePillActive,
                          selected && { backgroundColor: theme.primary },
                        ]}>
                        <Text style={[styles.datePillWeekday, selected && styles.datePillTextActive]}>
                          {dateOption.toLocaleDateString(localeTag, { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.datePillDay, selected && styles.datePillTextActive]}>
                          {dateOption.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <ScrollView style={styles.timeGrid} contentContainerStyle={styles.timeGridContent}>
                  {timeOptions.map((option) => {
                    const selected = option.hour === pickerHour && option.minute === pickerMinute;

                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => {
                          setPickerHour(option.hour);
                          setPickerMinute(option.minute);
                          setManualTime(formatManualTime(option.hour, option.minute));
                          setPickerError('');
                        }}
                        style={[
                          styles.timeOption,
                          selected && styles.timeOptionActive,
                          selected && { borderColor: theme.primary, backgroundColor: `${theme.primary}1F` },
                        ]}>
                        <Text
                          style={[
                            styles.timeOptionText,
                            selected && styles.timeOptionTextActive,
                            selected && { color: theme.primary },
                          ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.manualTimeRow}>
                  <Text style={styles.manualTimeLabel}>{t('taskEditor.exactTime')}</Text>
                  <TextInput
                    onChangeText={setManualTime}
                    value={manualTime}
                    placeholder={t('taskEditor.manualTimePlaceholder')}
                    placeholderTextColor="#8E96AC"
                    style={styles.manualTimeInput}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles.manualTimeRow}>
                  <Text style={styles.manualTimeLabel}>{t('taskEditor.durationShort')}</Text>
                  <TextInput
                    onChangeText={setDurationInput}
                    value={durationInput}
                    placeholder={t('taskEditor.durationPlaceholder')}
                    placeholderTextColor="#8E96AC"
                    style={styles.durationInput}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.durationPresetRow}>
                  {DURATION_PRESETS.map((value) => {
                    const selected = durationInput.trim() === String(value);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setDurationInput(String(value))}
                        style={[
                          styles.durationPill,
                          selected && { borderColor: theme.primary, backgroundColor: `${theme.primary}18` },
                        ]}>
                        <Text
                          style={[
                            styles.durationPillText,
                            selected && { color: theme.primary },
                          ]}>
                          {t('common.minutesShort', { minutes: value })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {pickerError ? <Text style={styles.pickerErrorText}>{pickerError}</Text> : null}

                <View style={styles.modalActions}>
                  <Pressable onPress={() => setPickerOpen(false)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={applyPicker}
                    style={[styles.primaryButtonCompact, { backgroundColor: theme.primary }]}>
                    <Text style={styles.primaryButtonText}>{t('common.apply')}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={colorPaletteOpen}>
        <View style={[styles.modalBackdrop, isPhoneLayout && styles.modalBackdropMobile]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 0}
            style={[styles.paletteKeyboardAvoiding, isPhoneLayout && styles.modalKeyboardAvoidingMobile]}>
            <View style={[styles.paletteModalCard, isPhoneLayout && styles.paletteModalCardMobile]}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.paletteModalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.paletteModalScroll}>
                {isPhoneLayout ? <View style={styles.sheetGrabber} /> : null}
                <View style={styles.paletteModalHeader}>
                  <Text style={styles.modalTitle}>{t('taskEditor.chooseCategoryColor')}</Text>
                  <Pressable onPress={closeCategoryColorPicker} style={styles.paletteCloseButton}>
                    <AppIcon color="#5B6581" name="close" size={20} />
                  </Pressable>
                </View>

                <View
                  onLayout={(event) => {
                    setPaletteGridWidth(event.nativeEvent.layout.width);
                  }}
                  style={styles.paletteGrid}>
                  <View
                    style={[
                      styles.paletteGridInner,
                      { width: paletteGridInnerWidth + PALETTE_SWATCH_OVERFLOW_GUTTER * 2 },
                    ]}>
                    <View style={styles.paletteGridWrap}>
                      {SPECTRUM_COLORS.map((color, swatchIndex) => {
                        const selected = swatchIndex === selectedPaletteIndex;
                        return (
                          <PaletteSwatch
                            key={`${color}-${swatchIndex}`}
                            color={color}
                            selected={selected}
                            size={paletteSwatchSize}
                            onPress={() => {
                              setSelectedPaletteIndex(swatchIndex);
                              setPaletteColor(color);
                              setPaletteHexInput(color);
                              setPaletteError('');
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>
                </View>
                {paletteError ? <Text style={styles.pickerErrorText}>{paletteError}</Text> : null}

                <View style={styles.paletteFooter}>
                  <View style={styles.paletteValuePill}>
                    <View
                      style={[
                        styles.customColorPreview,
                        { backgroundColor: normalizeHexColor(paletteHexInput) ?? paletteColor },
                      ]}
                    />
                    <TextInput
                      onChangeText={(value) => {
                        setSelectedPaletteIndex(null);
                        setPaletteHexInput(value);
                        setPaletteError('');
                      }}
                      value={paletteHexInput}
                      placeholder="#4C6FFF"
                      placeholderTextColor="#8E96AC"
                      style={styles.paletteFooterInput}
                      autoCapitalize="characters"
                    />
                  </View>
                  <Pressable
                    onPress={handleSaveCategoryColor}
                    style={[styles.paletteApplyButton, { backgroundColor: theme.primary }]}>
                    <Text style={styles.primaryButtonText}>{t('common.apply')}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={deleteConfirmOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteConfirmCard}>
            <View style={styles.deleteConfirmIconWrap}>
              <AppIcon color="#CB3750" name="delete-outline" size={20} />
            </View>
            <Text style={styles.deleteConfirmTitle}>{t('taskEditor.deleteTaskTitle')}</Text>
            <Text style={styles.deleteConfirmDescription}>{t('taskEditor.deleteTaskDescription')}</Text>
            <View style={styles.deleteConfirmActions}>
              <Pressable onPress={() => setDeleteConfirmOpen(false)} style={styles.deleteCancelButton}>
                <Text style={styles.deleteCancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmDeleteTask} style={styles.deleteConfirmButton}>
                <Text style={styles.deleteConfirmButtonText}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F5FC',
  },
  editorKeyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17213A',
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667294',
    lineHeight: 19,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#DEE7FA',
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  deleteTopButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F5',
    borderWidth: 1,
    borderColor: '#F3C7CE',
  },
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#E3EAF8',
    shadowColor: '#1A284F',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingSpacer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#243154',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667294',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E1F1',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FAFCFF',
    fontSize: 14,
    color: '#1A2133',
  },
  notesInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4DEF2',
    backgroundColor: '#F6F9FF',
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  pickerIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTextBlock: {
    flex: 1,
    gap: 1,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#243154',
  },
  pickerSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A7696',
  },
  repeatRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E8F7',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatTextBlock: {
    flex: 1,
    gap: 1,
    paddingRight: 12,
  },
  repeatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#44506E',
  },
  repeatSubtext: {
    fontSize: 12,
    color: '#7380A0',
    fontWeight: '600',
  },
  smallButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CDD8EE',
    backgroundColor: '#F5F8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A4972',
  },
  categoryList: {
    gap: 9,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    borderWidth: 1.3,
    borderRadius: 999,
    borderColor: '#CFD8EA',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FDFEFF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B3554',
    textAlign: 'center',
  },
  categoryColorButton: {
    width: 38,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DDEF',
    backgroundColor: '#F7FAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryColorDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  deleteCategoryButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3C7CE',
    backgroundColor: '#FFF3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customColorPreview: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  primaryButton: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2F52D0',
    backgroundColor: '#2F52D0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F52D0',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryButtonCompact: {
    borderRadius: 12,
    backgroundColor: '#2F52D0',
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0DAEE',
    backgroundColor: '#F5F8FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3D4A72',
  },
  errorText: {
    fontSize: 13,
    color: '#CF394A',
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 20, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalBackdropMobile: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalKeyboardAvoiding: {
    width: '100%',
    alignItems: 'center',
  },
  modalKeyboardAvoidingMobile: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  modalCardMobile: {
    maxWidth: 680,
    maxHeight: '86%',
    borderRadius: 24,
  },
  modalCardScroll: {
    width: '100%',
  },
  modalCardScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 64,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D2D9E8',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2133',
  },
  dateStrip: {
    maxHeight: 88,
  },
  datePill: {
    width: 58,
    height: 58,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#F1F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillActive: {
    backgroundColor: '#2F52D0',
  },
  datePillWeekday: {
    fontSize: 11,
    color: '#5F6985',
    fontWeight: '700',
  },
  datePillDay: {
    fontSize: 17,
    color: '#1A2133',
    fontWeight: '800',
  },
  datePillTextActive: {
    color: '#FFFFFF',
  },
  timeGrid: {
    maxHeight: 240,
  },
  timeGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  timeOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1DAEC',
    backgroundColor: '#F8FAFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: '30%',
  },
  timeOptionActive: {
    borderColor: '#2F52D0',
    backgroundColor: '#E6ECFF',
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E5A7A',
    textAlign: 'center',
  },
  timeOptionTextActive: {
    color: '#1F3FAA',
  },
  manualTimeRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  manualTimeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#44506F',
  },
  manualTimeInput: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD7EA',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFF',
    fontSize: 13,
    color: '#1A2133',
    textAlign: 'center',
    fontWeight: '700',
  },
  durationInput: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD7EA',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFF',
    fontSize: 13,
    color: '#1A2133',
    textAlign: 'center',
    fontWeight: '700',
  },
  durationPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CFD7EA',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E5A7A',
  },
  pickerErrorText: {
    fontSize: 12,
    color: '#CF394A',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  paletteModalCard: {
    width: '94%',
    maxWidth: 980,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4EBF8',
  },
  paletteModalCardMobile: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '88%',
    borderRadius: 24,
  },
  paletteKeyboardAvoiding: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteModalScroll: {
    width: '100%',
  },
  paletteModalScrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  paletteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paletteCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5FC',
  },
  paletteGrid: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 0,
    overflow: 'visible',
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  paletteGridInner: {
    position: 'relative',
    padding: PALETTE_SWATCH_OVERFLOW_GUTTER,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  paletteGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  paletteSwatchPress: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
    borderRadius: 0,
  },
  paletteSwatchHitbox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderRadius: 0,
  },
  paletteSwatch: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'visible',
  },
  paletteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paletteValuePill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DDEE',
    backgroundColor: '#FAFCFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteFooterInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#384260',
  },
  paletteApplyButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8D6DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    alignItems: 'center',
  },
  deleteConfirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2F5',
    borderWidth: 1,
    borderColor: '#F7CFD7',
  },
  deleteConfirmTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1A2133',
  },
  deleteConfirmDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#5D6886',
    fontWeight: '600',
    maxWidth: 340,
  },
  deleteConfirmActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  deleteCancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6DEEE',
    backgroundColor: '#F7FAFF',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#48557A',
  },
  deleteConfirmButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D44A62',
    backgroundColor: '#D94F68',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
