import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
      dayKey: getDayKey(date),
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.getDate(),
      label: date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      active: index === 2,
    };
  });
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function CalendarScreen() {
  const { calendarEvents } = useTasks();
  const days = useMemo(() => getWeekView(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(
    () => days.find((d) => d.active)?.dayKey ?? days[0]?.dayKey ?? ''
  );

  const selectedDay = useMemo(
    () => days.find((day) => day.dayKey === selectedDayKey),
    [days, selectedDayKey]
  );

  const selectedDayEvents = useMemo(
    () => calendarEvents.filter((event) => getDayKey(new Date(event.scheduledAt)) === selectedDayKey),
    [calendarEvents, selectedDayKey]
  );

  return (
    <ScreenShell title="Calendar" subtitle="Your task events are auto-synced here.">
      <AppCard delay={90}>
        <SectionLabel text="This Week" />
        <View style={styles.dayRow}>
          {days.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => setSelectedDayKey(d.dayKey)}
              style={[styles.dayPill, d.dayKey === selectedDayKey && styles.dayPillActive]}>
              <Text style={[styles.dayName, d.dayKey === selectedDayKey && styles.dayNameActive]}>{d.day}</Text>
              <Text style={[styles.dayDate, d.dayKey === selectedDayKey && styles.dayDateActive]}>{d.date}</Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Events" />
        <CardTitle accent="#3A86FF" icon="event" title="Synced From Tasks" />
        <Text style={styles.selectedDayText}>{selectedDay?.label ?? 'Selected day'}</Text>

        {selectedDayEvents.length === 0 ? (
          <Text style={styles.emptyText}>
            No events on this day. Add timed tasks in the Tasks tab.
          </Text>
        ) : (
          selectedDayEvents.map((event) => (
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
  selectedDayText: {
    fontSize: 13,
    color: '#6A738D',
    marginBottom: 10,
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
