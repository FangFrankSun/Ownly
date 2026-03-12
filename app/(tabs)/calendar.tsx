import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatTaskDateTime } from '@/components/app/task-date-utils';
import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useTasks } from '@/components/app/tasks-context';

function getWeekView() {
  const today = new Date();

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 2 + index);

    return {
      key: date.toISOString(),
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.getDate(),
      active: index === 2,
    };
  });
}

export default function CalendarScreen() {
  const { calendarEvents } = useTasks();
  const days = useMemo(() => getWeekView(), []);

  return (
    <ScreenShell title="Calendar" subtitle="Your task events are auto-synced here.">
      <AppCard delay={90}>
        <SectionLabel text="This Week" />
        <View style={styles.dayRow}>
          {days.map((d) => (
            <View key={d.key} style={[styles.dayPill, d.active && styles.dayPillActive]}>
              <Text style={[styles.dayName, d.active && styles.dayNameActive]}>{d.day}</Text>
              <Text style={[styles.dayDate, d.active && styles.dayDateActive]}>{d.date}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Upcoming" />
        <CardTitle accent="#3A86FF" icon="event" title="Synced From Tasks" />

        {calendarEvents.length === 0 ? (
          <Text style={styles.emptyText}>No timed tasks yet. Add tasks in the Tasks tab.</Text>
        ) : (
          calendarEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.dot, { backgroundColor: event.categoryColor }]} />
              <View style={styles.eventText}>
                <Text style={[styles.eventTitle, event.done && styles.eventTitleDone]}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {formatTaskDateTime(event.scheduledAt)} · {event.categoryName}
                  {event.repeatable ? ' · Repeats' : ''}
                </Text>
                {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
              </View>
              {event.repeatable ? <MaterialIcons color="#5D6A89" name="repeat" size={16} /> : null}
            </View>
          ))
        )}
      </AppCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F2F5FC',
    gap: 4,
  },
  dayPillActive: {
    backgroundColor: '#273352',
  },
  dayName: {
    fontSize: 12,
    color: '#63708A',
    fontWeight: '600',
  },
  dayNameActive: {
    color: '#DCE6FF',
  },
  dayDate: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2133',
  },
  dayDateActive: {
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#6A738D',
    lineHeight: 21,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F7F9FE',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2133',
  },
  eventTitleDone: {
    color: '#6A738E',
    textDecorationLine: 'line-through',
  },
  eventMeta: {
    fontSize: 13,
    color: '#6A738D',
  },
  eventNotes: {
    fontSize: 12,
    color: '#76809A',
  },
});
