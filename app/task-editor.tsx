import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  formatTaskDateTime,
  isValidIsoDate,
  toIsoWithDateAndTime,
} from '@/components/app/task-date-utils';
import { useTasks } from '@/components/app/tasks-context';

const CATEGORY_COLORS = ['#4C6FFF', '#17A673', '#FF8A4C', '#9B5DE5', '#E63946', '#2A9D8F'];

function buildDateOptions(days = 21) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildTimeOptions() {
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
        label: display.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      });
    }
  }

  return options;
}

export default function TaskEditorScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { tasks, categories, addTask, updateTask, addCategory, deleteCategory } = useTasks();

  const isEditing = typeof taskId === 'string' && taskId.length > 0;
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
  const [repeatable, setRepeatable] = useState(editingTask?.repeatable ?? false);
  const [error, setError] = useState('');

  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date(initialSchedule));
  const [pickerHour, setPickerHour] = useState(new Date(initialSchedule).getHours());
  const [pickerMinute, setPickerMinute] = useState(new Date(initialSchedule).getMinutes() >= 30 ? 30 : 0);

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  const openPicker = () => {
    const current = isValidIsoDate(scheduledAt) ? new Date(scheduledAt) : new Date();
    setPickerDate(current);
    setPickerHour(current.getHours());
    setPickerMinute(current.getMinutes() >= 30 ? 30 : 0);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    setScheduledAt(toIsoWithDateAndTime(pickerDate, pickerHour, pickerMinute));
    setPickerOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required.');
      return;
    }

    const newId = addCategory(newCategoryName, newCategoryColor);
    setCategoryId(newId);
    setNewCategoryName('');
    setError('');
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      setError('At least one category must remain.');
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
      setError('Task title is required.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    if (!isValidIsoDate(scheduledAt)) {
      setError('Choose a valid date and time.');
      return;
    }

    const payload = {
      title,
      notes,
      categoryId,
      scheduledAt,
      repeatable,
    };

    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }

    router.back();
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons color="#4A5576" name="close" size={22} />
          </Pressable>
          <Text style={styles.title}>{editingTask ? 'Edit Task' : 'Add Task'}</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Task Details</Text>
          <TextInput
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#8E96AC"
            style={styles.input}
            value={title}
          />
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor="#8E96AC"
            style={[styles.input, styles.notesInput]}
            value={notes}
          />
          <Pressable onPress={openPicker} style={styles.pickerButton}>
            <MaterialIcons color="#2F52D0" name="event" size={18} />
            <Text style={styles.pickerText}>{formatTaskDateTime(scheduledAt)}</Text>
          </Pressable>
          <View style={styles.repeatRow}>
            <Text style={styles.repeatLabel}>Repeat task</Text>
            <Switch
              ios_backgroundColor="#CCD3E3"
              onValueChange={setRepeatable}
              thumbColor={repeatable ? '#2345B8' : '#F3F5FB'}
              trackColor={{ false: '#CCD3E3', true: '#7FA0FF' }}
              value={repeatable}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Pressable onPress={() => setCategoryEditMode((prev) => !prev)} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{categoryEditMode ? 'Done' : 'Edit'}</Text>
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
                      { borderColor: category.color },
                      selected && { backgroundColor: category.color },
                    ]}>
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                      {category.name}
                    </Text>
                  </Pressable>
                  {categoryEditMode ? (
                    <Pressable onPress={() => handleDeleteCategory(category.id)} style={styles.deleteCategoryButton}>
                      <MaterialIcons color="#C7364A" name="delete-outline" size={18} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <TextInput
            onChangeText={setNewCategoryName}
            placeholder="New category name"
            placeholderTextColor="#8E96AC"
            style={styles.input}
            value={newCategoryName}
          />
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setNewCategoryColor(color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  newCategoryColor === color && styles.colorDotActive,
                ]}
              />
            ))}
          </View>
          <Pressable onPress={handleCreateCategory} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Add Category</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSave} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{editingTask ? 'Save Changes' : 'Create Task'}</Text>
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <Modal animationType="fade" transparent visible={pickerOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Date & Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
              {dateOptions.map((dateOption) => {
                const selected = dateOption.toDateString() === pickerDate.toDateString();
                return (
                  <Pressable
                    key={dateOption.toISOString()}
                    onPress={() => setPickerDate(dateOption)}
                    style={[styles.datePill, selected && styles.datePillActive]}>
                    <Text style={[styles.datePillWeekday, selected && styles.datePillTextActive]}>
                      {dateOption.toLocaleDateString(undefined, { weekday: 'short' })}
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
                    }}
                    style={[styles.timeOption, selected && styles.timeOptionActive]}>
                    <Text style={[styles.timeOptionText, selected && styles.timeOptionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setPickerOpen(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyPicker} style={styles.primaryButtonCompact}>
                <Text style={styles.primaryButtonText}>Apply</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 62,
    paddingBottom: 36,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2133',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EDF9',
  },
  card: {
    borderRadius: 24,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5A627B',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5DDEE',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FAFCFF',
    fontSize: 14,
    color: '#1A2133',
  },
  notesInput: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CAD5F0',
    backgroundColor: '#F3F7FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3C66',
  },
  repeatRow: {
    borderRadius: 12,
    backgroundColor: '#F7F9FE',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#55617E',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCD5EC',
    backgroundColor: '#F5F8FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D4A72',
  },
  categoryList: {
    gap: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B3554',
    textAlign: 'center',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
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
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#1A2133',
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: '#2F52D0',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCD5EC',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 20, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
