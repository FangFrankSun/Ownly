import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTaskDateTime } from '@/components/app/task-date-utils';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useTasks } from '@/components/app/tasks-context';

export default function TasksScreen() {
  const router = useRouter();
  const { tasks, categories, toggleTaskDone } = useTasks();

  const doneCount = tasks.filter((task) => task.done).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  return (
    <ScreenShell
      title="Tasks"
      subtitle="Track tasks and tap + to add a new one."
      floatingAction={
        <Pressable onPress={() => router.push('/task-editor')} style={styles.fab}>
          <MaterialIcons color="#FFFFFF" name="add" size={30} />
        </Pressable>
      }>
      <AppCard delay={90}>
        <SectionLabel text="Progress" />
        <CardTitle accent="#4361EE" icon="stars" title="Today Focus" />
        <Text style={styles.heroText}>
          {doneCount} of {tasks.length} tasks finished
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.metaText}>{progressPercent}% complete</Text>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="To-Do List" />
        {tasks.length === 0 ? <Text style={styles.emptyText}>No tasks yet. Tap + to add one.</Text> : null}
        {tasks.map((task) => {
          const category = categories.find((item) => item.id === task.categoryId);

          return (
            <View key={task.id} style={styles.taskItem}>
              <Pressable
                accessibilityLabel={`Mark ${task.title} as done`}
                onPress={() => toggleTaskDone(task.id)}
                style={[styles.check, task.done && styles.checkOn]}>
                {task.done ? <MaterialIcons color="#FFFFFF" name="check" size={14} /> : null}
              </Pressable>

              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, task.done && styles.rowTitleDone]}>{task.title}</Text>
                <Text style={styles.rowSubtitle}>
                  {formatTaskDateTime(task.scheduledAt)} · {category?.name ?? 'General'}
                  {task.repeatable ? ' · Repeats' : ''}
                </Text>
                {task.notes ? <Text style={styles.notesText}>{task.notes}</Text> : null}
              </View>

              <Pressable
                onPress={() => router.push({ pathname: '/task-editor', params: { taskId: task.id } })}
                style={styles.editButton}>
                <MaterialIcons color="#3D4A72" name="edit" size={16} />
              </Pressable>
            </View>
          );
        })}
      </AppCard>
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
    shadowColor: '#122045',
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
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    padding: 10,
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
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2133',
  },
  rowTitleDone: {
    color: '#6A738E',
    textDecorationLine: 'line-through',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#68708A',
  },
  notesText: {
    fontSize: 12,
    color: '#7A829B',
    marginTop: 2,
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
