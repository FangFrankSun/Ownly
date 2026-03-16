import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';

import { localizeTaskCategoryName } from '@/components/app/display-text';
import { AppCard, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { useTasks } from '@/components/app/tasks-context';
import { AppIcon } from '@/components/ui/app-icon';

type ViewMode = 'list' | 'year' | 'month' | 'week' | 'threeDay' | 'day';
type WeekDay = {
  key: string;
  dayKey: string;
  day: string;
  date: number;
  label: string;
  dateObject: Date;
};
type MonthCell = {
  key: string;
  dayKey: string;
  dayNumber: number;
  inMonth: boolean;
  date: Date;
};
type TimelineDay = {
  key: string;
  dayKey: string;
  weekday: string;
  shortLabel: string;
  date: Date;
};
type TimelineEvent = {
  id: string;
  title: string;
  notes: string;
  scheduledAt: string;
  durationMinutes: number;
  repeatable: boolean;
  done: boolean;
  categoryName: string;
  categoryColor: string;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
};

const VIEW_MODE_ITEMS: ViewMode[] = ['list', 'day', 'threeDay', 'week', 'month', 'year'];
const HORIZONTAL_MODE_ITEMS = VIEW_MODE_ITEMS;

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const MINUTES_IN_DAY = 24 * 60;
const TIMELINE_HOUR_HEIGHT = 46;
const MIN_EVENT_MINUTES = 30;
const DEFAULT_EVENT_MINUTES = 60;
const COMPLETED_DROPDOWN_OPEN_MS = 260;
const COMPLETED_DROPDOWN_CLOSE_MS = 220;
const COMPLETED_OPEN_STAGGER_MS = 60;
const COMPLETED_CLOSE_STAGGER_MS = 95;
const NOW_INDICATOR_COLOR = '#E53935';
const IS_IOS = Platform.OS === 'ios';
const MODE_MENU_POPOVER_LEFT = IS_IOS ? 126 : 136;
const MODE_MENU_PILL_GAP = IS_IOS ? 6 : 8;
const TIMELINE_RAIL_WIDTH = IS_IOS ? 42 : 50;
const TIMELINE_WRAP_PADDING = IS_IOS ? 6 : 8;

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getWeekView(weekStart: Date, localeTag: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      key: date.toISOString(),
      dayKey: getDayKey(date),
      day: date.toLocaleDateString(localeTag, { weekday: 'short' }),
      date: date.getDate(),
      label: date.toLocaleDateString(localeTag, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      dateObject: date,
    };
  });
}

function getMonthCells(monthDate: Date): MonthCell[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstDayOfWeek = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -firstDayOfWeek);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: date.toISOString(),
      dayKey: getDayKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear(),
      date,
    };
  });
}

function getWeekRangeLabel(days: WeekDay[], localeTag: string) {
  if (!days.length) {
    return '';
  }

  const startDate = days[0].dateObject;
  const endDate = days[days.length - 1].dateObject;
  return formatDateRange(startDate, endDate, localeTag);
}

function formatHourLabel(hour: number, localeTag: string) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(localeTag, { hour: 'numeric' });
}

function formatDateRange(startDate: Date, endDate: Date, localeTag: string) {
  const sameDay = getDayKey(startDate) === getDayKey(endDate);
  if (sameDay) {
    return startDate.toLocaleDateString(localeTag, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth && sameYear) {
    return `${startDate.toLocaleDateString(localeTag, {
      month: 'short',
    })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  return `${startDate.toLocaleDateString(localeTag, {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString(localeTag, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function getEmptyText(viewMode: ViewMode, t: (key: string) => string) {
  if (viewMode === 'day' || viewMode === 'threeDay' || viewMode === 'week') {
    return t('calendar.emptyRange');
  }
  if (viewMode === 'month') {
    return t('calendar.emptyDate');
  }
  if (viewMode === 'year') {
    return t('calendar.emptyYear');
  }
  return t('calendar.emptyDay');
}

function formatDurationLabel(
  minutes: number,
  _localeTag: string,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return t('calendar.durationUnknown');
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  if (minutes > 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function getEventEndDate(startDate: Date, durationMinutes: number) {
  const safeDuration =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : DEFAULT_EVENT_MINUTES;
  return new Date(startDate.getTime() + safeDuration * 60 * 1000);
}

function formatEventTimeRange(scheduledAt: string, durationMinutes: number, localeTag: string, t: (key: string) => string) {
  const startDate = new Date(scheduledAt);
  if (Number.isNaN(startDate.getTime())) {
    return t('calendar.unknownTime');
  }
  const endDate = getEventEndDate(startDate, durationMinutes);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${startDate.toLocaleTimeString(localeTag, timeOptions)} - ${endDate.toLocaleTimeString(localeTag, timeOptions)}`;
}

function formatEventDateTimeRange(
  scheduledAt: string,
  durationMinutes: number,
  localeTag: string,
  t: (key: string) => string
) {
  const startDate = new Date(scheduledAt);
  if (Number.isNaN(startDate.getTime())) {
    return t('calendar.unknownSchedule');
  }
  return `${startDate.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })} · ${formatEventTimeRange(scheduledAt, durationMinutes, localeTag, t)}`;
}

function buildTimelineDays(mode: ViewMode, focusDate: Date, localeTag: string): TimelineDay[] {
  const dayCount = mode === 'day' ? 1 : mode === 'threeDay' ? 3 : mode === 'week' ? 7 : 0;
  if (dayCount === 0) {
    return [];
  }

  const startDate = mode === 'week' ? startOfWeek(focusDate) : startOfDay(focusDate);
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      key: `${mode}-${date.toISOString()}`,
      dayKey: getDayKey(date),
      weekday: date.toLocaleDateString(localeTag, { weekday: 'short' }),
      shortLabel: date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }),
      date,
    };
  });
}

function renderViewModeIcon(mode: ViewMode, color: string) {
  if (mode === 'list') {
    return (
      <View style={styles.modeGlyphList}>
        {[0, 1, 2].map((line) => (
          <View key={`list-line-${line}`} style={[styles.modeGlyphLine, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  if (mode === 'day') {
    return <View style={[styles.modeGlyphBar, styles.modeGlyphBarDay, { backgroundColor: color }]} />;
  }

  if (mode === 'threeDay') {
    return (
      <View style={styles.modeGlyphBars}>
        {[0, 1, 2].map((bar) => (
          <View key={`three-day-${bar}`} style={[styles.modeGlyphBar, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  if (mode === 'week') {
    return (
      <View style={styles.modeGlyphBars}>
        {[0, 1, 2, 3, 4].map((bar) => (
          <View key={`week-${bar}`} style={[styles.modeGlyphBar, styles.modeGlyphBarWeek, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  if (mode === 'month') {
    return (
      <View style={styles.modeGlyphGridMonth}>
        {Array.from({ length: 6 }, (_, index) => (
          <View key={`month-${index}`} style={[styles.modeGlyphCellMonth, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.modeGlyphGridYear}>
      {Array.from({ length: 12 }, (_, index) => (
        <View key={`year-${index}`} style={[styles.modeGlyphCellYear, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

export default function CalendarScreen() {
  const { effectiveLanguage, localeTag, t } = useLanguage();
  const router = useRouter();
  const { calendarEvents } = useTasks();
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayDayKey = useMemo(() => getDayKey(today), [today]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<(typeof calendarEvents)[number] | null>(null);
  const [showCompletedEvents, setShowCompletedEvents] = useState(true);
  const [isHidingCompletedEvents, setIsHidingCompletedEvents] = useState(false);
  const completedStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingCompletedToggle = useRef(false);
  const [visibleCompletedEventsCount, setVisibleCompletedEventsCount] = useState(0);
  const [showCompletedEventsHiddenHint, setShowCompletedEventsHiddenHint] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  const [listWeekOffset, setListWeekOffset] = useState(0);
  const [selectedListDayIndex, setSelectedListDayIndex] = useState(() => new Date().getDay());

  const [focusDate, setFocusDate] = useState(today);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [selectedMonthDayKey, setSelectedMonthDayKey] = useState(() => getDayKey(new Date()));
  const [selectedYearDayKey, setSelectedYearDayKey] = useState(() => getDayKey(new Date()));

  const listWeekStartDate = useMemo(
    () => addDays(startOfWeek(today), listWeekOffset * 7),
    [listWeekOffset, today]
  );
  const listWeekDays = useMemo(() => getWeekView(listWeekStartDate, localeTag), [listWeekStartDate, localeTag]);
  const listWeekRangeLabel = useMemo(() => getWeekRangeLabel(listWeekDays, localeTag), [listWeekDays, localeTag]);
  const selectedListDay = listWeekDays[selectedListDayIndex] ?? listWeekDays[0];

  const monthDate = useMemo(() => {
    const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [monthOffset, today]);

  const yearValue = today.getFullYear() + yearOffset;
  const yearColumns = windowWidth >= 900 ? 4 : 3;
  const yearCardWidth = yearColumns === 4 ? '24%' : '32%';
  const monthCells = useMemo(() => getMonthCells(monthDate), [monthDate]);
  const selectedMonthCell = useMemo(() => {
    return (
      monthCells.find((cell) => cell.inMonth && cell.dayKey === selectedMonthDayKey) ??
      monthCells.find((cell) => cell.inMonth)
    );
  }, [monthCells, selectedMonthDayKey]);
  const yearMonths = useMemo(
    () => Array.from({ length: 12 }, (_, month) => new Date(yearValue, month, 1)),
    [yearValue]
  );

  const timelineDays = useMemo(() => buildTimelineDays(viewMode, focusDate, localeTag), [focusDate, localeTag, viewMode]);
  const viewModeItems = useMemo(
    () => VIEW_MODE_ITEMS.map((mode) => ({ mode, label: t(`calendar.${mode}`) })),
    [t]
  );
  const weekHeaderLabels = useMemo(() => {
    const anchor = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(anchor, index);
      return date.toLocaleDateString(localeTag, {
        weekday: effectiveLanguage === 'zh' ? 'short' : 'narrow',
      });
    });
  }, [effectiveLanguage, localeTag]);
  const timelineDayKeys = useMemo(() => new Set(timelineDays.map((day) => day.dayKey)), [timelineDays]);
  const timelineBounds = useMemo(() => {
    const defaultStartMinutes = DAY_START_HOUR * 60;
    const defaultEndMinutes = DAY_END_HOUR * 60;
    if (!timelineDays.length) {
      return { startMinutes: defaultStartMinutes, endMinutes: defaultEndMinutes };
    }

    let minMinutes = defaultStartMinutes;
    let maxMinutes = defaultEndMinutes;

    for (const event of calendarEvents) {
      const eventDate = new Date(event.scheduledAt);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      if (!timelineDayKeys.has(getDayKey(eventDate))) {
        continue;
      }

      const startMinutesRaw = eventDate.getHours() * 60 + eventDate.getMinutes();
      const durationMinutes = Math.max(MIN_EVENT_MINUTES, event.durationMinutes || DEFAULT_EVENT_MINUTES);
      const endMinutesRaw = Math.min(MINUTES_IN_DAY, startMinutesRaw + durationMinutes);

      minMinutes = Math.min(minMinutes, startMinutesRaw);
      maxMinutes = Math.max(maxMinutes, endMinutesRaw);
    }

    const boundedMin = Math.max(0, Math.floor(minMinutes / 60) * 60);
    const boundedMax = Math.min(MINUTES_IN_DAY, Math.ceil(maxMinutes / 60) * 60);
    if (boundedMax <= boundedMin) {
      return { startMinutes: defaultStartMinutes, endMinutes: defaultEndMinutes };
    }

    return { startMinutes: boundedMin, endMinutes: boundedMax };
  }, [calendarEvents, timelineDayKeys, timelineDays.length]);
  const timelineTotalMinutes = Math.max(60, timelineBounds.endMinutes - timelineBounds.startMinutes);
  const timelineHeight = (timelineTotalMinutes / 60) * TIMELINE_HOUR_HEIGHT;
  const timeLabels = useMemo(() => {
    const startHour = timelineBounds.startMinutes / 60;
    const endHour = timelineBounds.endMinutes / 60;
    return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  }, [timelineBounds.endMinutes, timelineBounds.startMinutes]);
  const nowDate = useMemo(() => new Date(nowTimestamp), [nowTimestamp]);
  const nowDayKey = useMemo(() => getDayKey(nowDate), [nowDate]);
  const nowMinutes = useMemo(() => nowDate.getHours() * 60 + nowDate.getMinutes(), [nowDate]);
  const showNowIndicator = useMemo(() => {
    if (!(viewMode === 'day' || viewMode === 'threeDay' || viewMode === 'week')) {
      return false;
    }
    if (!timelineDayKeys.has(nowDayKey)) {
      return false;
    }
    return nowMinutes >= timelineBounds.startMinutes && nowMinutes <= timelineBounds.endMinutes;
  }, [nowDayKey, nowMinutes, timelineBounds.endMinutes, timelineBounds.startMinutes, timelineDayKeys, viewMode]);
  const nowIndicatorTop = useMemo(() => {
    if (!showNowIndicator) {
      return 0;
    }
    return ((nowMinutes - timelineBounds.startMinutes) / timelineTotalMinutes) * timelineHeight;
  }, [nowMinutes, showNowIndicator, timelineBounds.startMinutes, timelineHeight, timelineTotalMinutes]);

  useEffect(() => {
    const todayInMonth =
      today.getFullYear() === monthDate.getFullYear() && today.getMonth() === monthDate.getMonth();
    if (todayInMonth) {
      setSelectedMonthDayKey(todayDayKey);
      return;
    }

    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    setSelectedMonthDayKey(getDayKey(firstDayOfMonth));
  }, [monthDate, today, todayDayKey]);

  useEffect(() => {
    const todayInYear = today.getFullYear() === yearValue;
    if (todayInYear) {
      setSelectedYearDayKey(todayDayKey);
      return;
    }
    setSelectedYearDayKey(getDayKey(new Date(yearValue, 0, 1)));
  }, [today, todayDayKey, yearValue]);
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    return () => {
      if (completedStepTimer.current) {
        clearTimeout(completedStepTimer.current);
        completedStepTimer.current = null;
      }
      isAnimatingCompletedToggle.current = false;
    };
  }, []);
  const eventDayKeys = useMemo(() => {
    return new Set(
      calendarEvents
        .map((event) => new Date(event.scheduledAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map((date) => getDayKey(date))
    );
  }, [calendarEvents]);

  const timelineEventsByDay = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    if (!timelineDays.length) {
      return map;
    }

    const minMinutes = timelineBounds.startMinutes;
    const maxMinutes = timelineBounds.endMinutes;

    for (const event of calendarEvents) {
      const eventDate = new Date(event.scheduledAt);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      const dayKey = getDayKey(eventDate);
      if (!timelineDayKeys.has(dayKey)) {
        continue;
      }

      const startMinutesRaw = eventDate.getHours() * 60 + eventDate.getMinutes();
      const durationMinutes = Math.max(MIN_EVENT_MINUTES, event.durationMinutes || DEFAULT_EVENT_MINUTES);
      const startMinutes = Math.max(minMinutes, Math.min(maxMinutes - MIN_EVENT_MINUTES, startMinutesRaw));
      const endMinutes = Math.max(
        startMinutes + MIN_EVENT_MINUTES,
        Math.min(maxMinutes, startMinutesRaw + durationMinutes)
      );
      const dayEvents = map.get(dayKey) ?? [];

      dayEvents.push({
        id: event.id,
        title: event.title,
        notes: event.notes,
        scheduledAt: event.scheduledAt,
        durationMinutes: event.durationMinutes,
        repeatable: event.repeatable,
        done: event.done,
        categoryName: event.categoryName,
        categoryColor: event.categoryColor,
        startMinutes,
        endMinutes,
        lane: 0,
        laneCount: 1,
      });

      map.set(dayKey, dayEvents);
    }

    map.forEach((events) => {
      events.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

      const laneEndTimes: number[] = [];
      for (const event of events) {
        let lane = laneEndTimes.findIndex((endTime) => endTime <= event.startMinutes);
        if (lane < 0) {
          lane = laneEndTimes.length;
          laneEndTimes.push(event.endMinutes);
        } else {
          laneEndTimes[lane] = event.endMinutes;
        }
        event.lane = lane;
      }

      const laneCount = Math.max(1, laneEndTimes.length);
      events.forEach((event) => {
        event.laneCount = laneCount;
      });
    });

    return map;
  }, [calendarEvents, timelineBounds.endMinutes, timelineBounds.startMinutes, timelineDayKeys, timelineDays.length]);

  const periodEvents = useMemo(() => {
    const events = calendarEvents.filter((event) => {
      const eventDate = new Date(event.scheduledAt);
      if (Number.isNaN(eventDate.getTime())) {
        return false;
      }

      if (viewMode === 'list') {
        return selectedListDay ? getDayKey(eventDate) === selectedListDay.dayKey : false;
      }

      if (viewMode === 'month') {
        return selectedMonthCell ? getDayKey(eventDate) === selectedMonthCell.dayKey : false;
      }

      if (viewMode === 'year') {
        return getDayKey(eventDate) === selectedYearDayKey;
      }

      return timelineDayKeys.has(getDayKey(eventDate));
    });

    return events.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [calendarEvents, selectedListDay, selectedMonthCell, selectedYearDayKey, timelineDayKeys, viewMode]);
  const activePeriodEvents = useMemo(() => periodEvents.filter((event) => !event.done), [periodEvents]);
  const completedPeriodEvents = useMemo(() => periodEvents.filter((event) => event.done), [periodEvents]);
  const visibleCompletedPeriodEvents = completedPeriodEvents.slice(0, visibleCompletedEventsCount);
  useEffect(() => {
    if (isAnimatingCompletedToggle.current) {
      return;
    }
    if (showCompletedEvents) {
      setVisibleCompletedEventsCount(completedPeriodEvents.length);
    } else {
      setVisibleCompletedEventsCount((prev) => Math.min(prev, completedPeriodEvents.length));
    }
  }, [completedPeriodEvents.length, showCompletedEvents]);

  const periodSummary = useMemo(() => {
    if (viewMode === 'list') {
      return listWeekRangeLabel;
    }
    if (viewMode === 'month') {
      return monthDate.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'year') {
      const [year, month, day] = selectedYearDayKey.split('-').map((item) => Number(item));
      const selectedDate = new Date(year, month, day);
      return selectedDate.toLocaleDateString(localeTag, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (!timelineDays.length) {
      return '';
    }
    return formatDateRange(timelineDays[0].date, timelineDays[timelineDays.length - 1].date, localeTag);
  }, [listWeekRangeLabel, localeTag, monthDate, selectedYearDayKey, timelineDays, viewMode]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'list') {
      return selectedListDay?.label ?? '';
    }
    if (viewMode === 'month') {
      return selectedMonthCell
        ? selectedMonthCell.date.toLocaleDateString(localeTag, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : monthDate.toLocaleDateString(localeTag, {
            month: 'long',
            year: 'numeric',
          });
    }
    if (viewMode === 'year') {
      const [year, month, day] = selectedYearDayKey.split('-').map((item) => Number(item));
      const selectedDate = new Date(year, month, day);
      return selectedDate.toLocaleDateString(localeTag, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (!timelineDays.length) {
      return '';
    }
    return formatDateRange(timelineDays[0].date, timelineDays[timelineDays.length - 1].date, localeTag);
  }, [localeTag, monthDate, selectedListDay, selectedMonthCell, selectedYearDayKey, timelineDays, viewMode]);

  const shiftPeriod = (delta: number) => {
    if (viewMode === 'list') {
      setListWeekOffset((prev) => prev + delta);
      return;
    }

    if (viewMode === 'month') {
      setMonthOffset((prev) => prev + delta);
      return;
    }

    if (viewMode === 'year') {
      setYearOffset((prev) => prev + delta);
      return;
    }

    const dayJump = viewMode === 'day' ? 1 : viewMode === 'threeDay' ? 3 : 7;
    setFocusDate((prev) => addDays(prev, delta * dayJump));
  };

  const selectViewMode = (mode: ViewMode) => {
    if (mode === viewMode) {
      setIsModeMenuOpen(false);
      return;
    }

    if (mode === 'list') {
      const [selectedYear, selectedYearMonth, selectedYearDate] = selectedYearDayKey
        .split('-')
        .map((item) => Number(item));
      const yearAnchorDate = new Date(selectedYear, selectedYearMonth, selectedYearDate);
      const anchorDate =
        viewMode === 'month'
          ? selectedMonthCell?.date ?? today
          : viewMode === 'year'
            ? yearAnchorDate
            : focusDate;
      const baseWeek = startOfWeek(today).getTime();
      const targetWeek = startOfWeek(anchorDate).getTime();
      const weekOffset = Math.round((targetWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
      setListWeekOffset(weekOffset);
      setSelectedListDayIndex(anchorDate.getDay());
    }

    if (mode === 'day' || mode === 'threeDay' || mode === 'week') {
      if (selectedListDay?.dateObject) {
        setFocusDate(startOfDay(selectedListDay.dateObject));
      } else {
        setFocusDate(today);
      }
    }

    setViewMode(mode);
    setIsModeMenuOpen(false);
  };

  const handleEditSelectedEvent = () => {
    if (!selectedEvent) {
      return;
    }
    const taskId = selectedEvent.id;
    setSelectedEvent(null);
    router.push({ pathname: '/task-editor', params: { taskId } });
  };
  const clearCompletedSequenceTimer = () => {
    if (completedStepTimer.current) {
      clearTimeout(completedStepTimer.current);
      completedStepTimer.current = null;
    }
    isAnimatingCompletedToggle.current = false;
  };
  const toggleCompletedEventsVisibility = () => {
    clearCompletedSequenceTimer();

    if (showCompletedEvents) {
      setIsHidingCompletedEvents(true);
      setShowCompletedEventsHiddenHint(false);
      const total = visibleCompletedEventsCount;
      if (total <= 0) {
        setShowCompletedEvents(false);
        setIsHidingCompletedEvents(false);
        setShowCompletedEventsHiddenHint(true);
        return;
      }
      isAnimatingCompletedToggle.current = true;
      const hideNext = () => {
        setVisibleCompletedEventsCount((previous) => {
          const next = Math.max(0, previous - 1);
          if (next === 0) {
            isAnimatingCompletedToggle.current = false;
            setShowCompletedEvents(false);
            setIsHidingCompletedEvents(false);
            setShowCompletedEventsHiddenHint(true);
          } else {
            completedStepTimer.current = setTimeout(hideNext, COMPLETED_CLOSE_STAGGER_MS);
          }
          return next;
        });
      };
      hideNext();
      return;
    }

    setShowCompletedEvents(true);
    setIsHidingCompletedEvents(false);
    setShowCompletedEventsHiddenHint(false);
    const total = completedPeriodEvents.length;
    if (total <= 0) {
      setVisibleCompletedEventsCount(0);
      return;
    }
    setVisibleCompletedEventsCount(0);
    isAnimatingCompletedToggle.current = true;
    const showNext = (nextCount: number) => {
      setVisibleCompletedEventsCount(nextCount);
      if (nextCount >= total) {
        isAnimatingCompletedToggle.current = false;
        return;
      }
      completedStepTimer.current = setTimeout(() => showNext(nextCount + 1), COMPLETED_OPEN_STAGGER_MS);
    };
    showNext(1);
  };
  const renderEventRow = (
    event: (typeof periodEvents)[number],
    inCompletedSection: boolean
  ) => (
    <Pressable
      key={event.id}
      onPress={() => setSelectedEvent(event)}
      style={[styles.eventRow, inCompletedSection && styles.eventRowCompleted]}>
      <View style={[styles.dot, { backgroundColor: event.categoryColor }]} />
      <View style={styles.eventText}>
        <Text style={[styles.eventTitle, event.done && styles.eventTitleDone]}>{event.title}</Text>
        <Text style={styles.eventMeta}>
          {formatEventDateTimeRange(event.scheduledAt, event.durationMinutes, localeTag, t)} · {formatDurationLabel(event.durationMinutes, localeTag, t)} ·{' '}
          {localizeTaskCategoryName(event.categoryName, effectiveLanguage)}
          {event.repeatable ? ` · ${t('calendar.repeats')}` : ''}
        </Text>
        {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
      </View>
      {event.repeatable ? <AppIcon color="#5D6A89" name="repeat" size={16} /> : null}
    </Pressable>
  );
  const activeModeItem = viewModeItems.find((item) => item.mode === viewMode) ?? viewModeItems[0];

  return (
    <ScreenShell title={t('calendar.title')} subtitle={t('calendar.subtitle')}>
      <AppCard delay={90}>
        <View style={styles.headerArea}>
          <View style={styles.modeRow}>
            <View style={styles.modeAnchor}>
              <Pressable onPress={() => setIsModeMenuOpen((prev) => !prev)} style={styles.modeTrigger}>
                {renderViewModeIcon(activeModeItem.mode, theme.secondary)}
                <Text style={[styles.modeTriggerText, { color: theme.secondary }]}>
                  {activeModeItem.label}
                </Text>
                <AppIcon color={theme.secondary} name="keyboard-arrow-right" size={20} />
              </Pressable>

              {isModeMenuOpen ? (
                <Animated.View
                  entering={FadeInRight.duration(180)}
                  exiting={FadeOutRight.duration(140)}
                  style={styles.modeMenuPopover}>
                  <ScrollView
                    horizontal
                    style={styles.modeMenuScroll}
                    contentContainerStyle={styles.modeMenuScrollContent}
                    showsHorizontalScrollIndicator={false}>
                    {HORIZONTAL_MODE_ITEMS.map((mode) => {
                      const item = viewModeItems.find((candidate) => candidate.mode === mode);
                      const selected = mode === viewMode;

                      return (
                        <Pressable
                          key={mode}
                          onPress={() => selectViewMode(mode)}
                          style={[
                            styles.modePill,
                            selected && {
                              backgroundColor: `${theme.primary}20`,
                              borderColor: `${theme.primary}66`,
                            },
                            ]}>
                          {renderViewModeIcon(mode, selected ? theme.primary : '#415072')}
                          <Text
                            style={[
                              styles.modePillLabel,
                              selected && { color: theme.primary, fontWeight: '800' },
                            ]}>
                            {item?.label ?? t(`calendar.${mode}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              ) : null}
            </View>
          </View>

          <View style={styles.periodNavRow}>
            <Pressable onPress={() => shiftPeriod(-1)} style={styles.navButton}>
              <AppIcon color={theme.secondary} name="chevron-left" size={22} />
            </Pressable>

            <Text numberOfLines={1} style={styles.periodText}>
              {periodSummary}
            </Text>

            <Pressable onPress={() => shiftPeriod(1)} style={styles.navButton}>
              <AppIcon color={theme.secondary} name="chevron-right" size={22} />
            </Pressable>
          </View>
        </View>

        {viewMode === 'list' ? (
          <Animated.View
            key={listWeekDays[0]?.dayKey ?? 'list-week'}
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(220)}
            style={styles.dayRow}>
            {listWeekDays.map((day, index) => (
              <Pressable
                key={day.key}
                onPress={() => setSelectedListDayIndex(index)}
                style={[
                  styles.dayPill,
                  selectedListDay?.dayKey === day.dayKey && styles.dayPillActive,
                  selectedListDay?.dayKey === day.dayKey && { backgroundColor: theme.primary },
                ]}>
                <Text style={[styles.dayName, selectedListDay?.dayKey === day.dayKey && styles.dayNameActive]}>
                  {day.day}
                </Text>
                <Text style={[styles.dayDate, selectedListDay?.dayKey === day.dayKey && styles.dayDateActive]}>
                  {day.date}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        {viewMode === 'day' || viewMode === 'threeDay' || viewMode === 'week' ? (
          <Animated.View
            key={`${viewMode}-${timelineDays[0]?.dayKey ?? 'timeline'}`}
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(220)}
            style={[
              styles.timelineWrap,
              {
                borderColor: `${theme.primary}2A`,
                backgroundColor: `${theme.primary}0C`,
              },
            ]}>
            {viewMode === 'day' ? (
              <View style={styles.dayModeSingleRow}>
                <View
                  style={[
                    styles.dayModeSinglePill,
                    {
                      borderColor: `${theme.primary}33`,
                      backgroundColor: `${theme.primary}12`,
                    },
                  ]}>
                  <Text style={[styles.dayModeSingleWeekday, { color: theme.primary }]}>
                    {focusDate.toLocaleDateString(localeTag, { weekday: 'short' })}
                  </Text>
                  <Text style={styles.dayModeSingleDate}>
                    {focusDate.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            ) : null}

            {viewMode !== 'day' ? (
              <View style={styles.timelineHeader}>
                <View style={styles.timeRailSpacer} />
                {timelineDays.map((day) => {
                  const isToday = day.dayKey === todayDayKey;

                  return (
                    <View key={day.key} style={styles.timelineDayHeaderCell}>
                      <Text style={styles.timelineWeekday}>{day.weekday}</Text>
                      <View
                        style={[
                          styles.timelineDayBadge,
                          isToday && { backgroundColor: theme.primary },
                        ]}>
                        <Text
                          style={[
                            styles.timelineDayBadgeText,
                            isToday && styles.timelineDayBadgeTextToday,
                          ]}>
                          {day.date.getDate()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.timelineBody, { height: timelineHeight }]}>
              <View style={styles.timeRail}>
                {timeLabels.map((hour, index) => (
                  <Text
                    key={`label-${hour}`}
                    style={[styles.timeRailText, { top: index * TIMELINE_HOUR_HEIGHT - 8 }]}>
                    {formatHourLabel(hour, localeTag)}
                  </Text>
                ))}
              </View>

              <View style={styles.timelineColumnsWrap}>
                {timelineDays.map((day) => {
                  const dayEvents = timelineEventsByDay.get(day.dayKey) ?? [];
                  return (
                    <View key={`col-${day.key}`} style={styles.timelineDayColumn}>
                      {timeLabels.map((hour, index) => (
                        <View
                          key={`line-${day.dayKey}-${hour}`}
                          style={[
                            styles.timelineHourLine,
                            {
                              top: index * TIMELINE_HOUR_HEIGHT,
                              borderColor: index % 2 === 0 ? '#E3E9F6' : '#EEF2FA',
                            },
                          ]}
                        />
                      ))}

                      {dayEvents.map((event) => {
                        const top =
                          ((event.startMinutes - timelineBounds.startMinutes) / timelineTotalMinutes) *
                          timelineHeight;
                        const minHeight = Math.max(
                          24,
                          (MIN_EVENT_MINUTES / timelineTotalMinutes) * timelineHeight
                        );
                        const computedHeight =
                          ((event.endMinutes - event.startMinutes) / timelineTotalMinutes) *
                          timelineHeight;
                        const maxHeight = Math.max(14, timelineHeight - top - 2);
                        const height = Math.min(maxHeight, Math.max(minHeight, computedHeight));
                        const laneWidth = 100 / event.laneCount;
                        const width = Math.max(18, laneWidth - 2);

                        return (
                          <Pressable
                            key={`event-${event.id}`}
                            onPress={() => setSelectedEvent(event)}
                            style={[
                              styles.timelineEventBlock,
                              {
                                top,
                                height,
                                left: `${event.lane * laneWidth + 1}%`,
                                width: `${width}%`,
                                backgroundColor: `${event.categoryColor}D9`,
                                borderColor: `${event.categoryColor}EE`,
                              },
                            ]}>
                            <Text numberOfLines={1} style={styles.timelineEventTitle}>
                              {event.title}
                            </Text>
                            <Text numberOfLines={1} style={styles.timelineEventMeta}>
                              {formatEventTimeRange(event.scheduledAt, event.durationMinutes, localeTag, t)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
                {showNowIndicator ? (
                  <View
                    pointerEvents="none"
                    style={[styles.nowIndicatorLine, { top: nowIndicatorTop, backgroundColor: NOW_INDICATOR_COLOR }]}>
                    <View style={[styles.nowIndicatorDot, { backgroundColor: NOW_INDICATOR_COLOR }]} />
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        ) : null}

        {viewMode === 'month' ? (
          <View
            style={[
              styles.monthWrap,
              {
                borderColor: `${theme.primary}2A`,
                backgroundColor: `${theme.primary}0D`,
              },
            ]}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthHeaderTitle}>
                {monthDate.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' })}
              </Text>
              {selectedMonthCell ? (
                <Text style={[styles.monthHeaderSubtitle, { color: theme.secondary }]}>
                  {selectedMonthCell.date.toLocaleDateString(localeTag, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              ) : null}
            </View>
            <View style={styles.gridWeekHeader}>
              {weekHeaderLabels.map((label) => (
                <Text key={label} style={styles.gridWeekLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthCells.map((cell) => {
                const selected = selectedMonthCell?.dayKey === cell.dayKey;
                const isToday = cell.dayKey === todayDayKey;
                const hasEvents = eventDayKeys.has(cell.dayKey);

                return (
                  <Pressable
                    key={cell.key}
                    disabled={!cell.inMonth}
                    onPress={() => setSelectedMonthDayKey(cell.dayKey)}
                    style={[
                      styles.monthCell,
                      !cell.inMonth && styles.monthCellMuted,
                      isToday && styles.monthCellToday,
                      isToday &&
                        !selected && {
                          borderColor: theme.secondary,
                          backgroundColor: `${theme.secondary}14`,
                        },
                      selected && styles.monthCellSelected,
                      selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}>
                    <Text
                      style={[
                        styles.monthCellText,
                        !cell.inMonth && styles.monthCellTextMuted,
                        isToday && !selected && { color: theme.secondary },
                        selected && styles.monthCellTextSelected,
                      ]}>
                      {cell.dayNumber}
                    </Text>
                    <View
                      style={[
                        styles.monthDot,
                        !hasEvents && styles.monthDotHidden,
                        hasEvents && !selected && { backgroundColor: theme.primary },
                        hasEvents && selected && styles.monthDotSelected,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {viewMode === 'year' ? (
          <View style={styles.yearGrid}>
            {yearMonths.map((month) => {
              const miniCells = getMonthCells(month);

              return (
                <View key={month.toISOString()} style={[styles.yearMonthCard, { width: yearCardWidth }]}>
                  <Text style={styles.yearMonthTitle}>
                    {month.toLocaleDateString(localeTag, { month: 'short' })}
                  </Text>
                  <View style={styles.miniWeekHeader}>
                    {weekHeaderLabels.map((label) => (
                      <Text key={`${month.toISOString()}-${label}`} style={styles.miniWeekLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.miniMonthGrid}>
                    {miniCells.map((cell) => (
                      <Pressable
                        key={cell.key}
                        disabled={!cell.inMonth}
                        onPress={() => {
                          setSelectedYearDayKey(cell.dayKey);
                        }}
                        style={[
                          styles.miniMonthDay,
                          selectedYearDayKey === cell.dayKey &&
                            cell.inMonth && [styles.miniMonthDaySelected, { backgroundColor: `${theme.primary}18` }],
                          !cell.inMonth && styles.miniMonthDayMuted,
                          eventDayKeys.has(cell.dayKey) &&
                            cell.inMonth && styles.miniMonthDayEvent,
                          cell.dayKey === todayDayKey &&
                            cell.inMonth && [styles.miniMonthDayToday, { borderColor: theme.secondary }],
                        ]}>
                        <Text
                          style={[
                            styles.miniMonthDayText,
                            !cell.inMonth && styles.miniMonthDayTextMuted,
                            eventDayKeys.has(cell.dayKey) &&
                              cell.inMonth && [styles.miniMonthDayTextEvent, { color: theme.primary }],
                            selectedYearDayKey === cell.dayKey &&
                              cell.inMonth && { color: theme.primary, fontWeight: '800' },
                          ]}>
                          {cell.inMonth ? cell.dayNumber : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </AppCard>

      {viewMode === 'list' || viewMode === 'month' || viewMode === 'year' ? (
        <>
          <AppCard delay={160}>
            <SectionLabel text={t('tasks.todo')} />
            <Text style={styles.selectedDayText}>{periodLabel}</Text>

            {activePeriodEvents.length === 0 && completedPeriodEvents.length === 0 ? (
              <Text style={styles.emptyText}>{getEmptyText(viewMode, t)}</Text>
            ) : activePeriodEvents.length === 0 ? (
              <Text style={styles.emptyText}>{t('calendar.emptyRange')}</Text>
            ) : null}
            {activePeriodEvents.map((event) => renderEventRow(event, false))}
          </AppCard>

          <AppCard delay={190}>
            <View style={styles.completedHeaderRow}>
              <SectionLabel text={t('tasks.completed')} />
              <Pressable
                disabled={isAnimatingCompletedToggle.current}
                onPress={toggleCompletedEventsVisibility}
                style={[styles.completedEventsToggle, { borderColor: `${theme.primary}33` }]}>
                <Text style={[styles.completedEventsToggleText, { color: theme.primary }]}>
                  {showCompletedEvents ? t('common.hide') : t('common.show')} ({completedPeriodEvents.length})
                </Text>
                <AppIcon
                  color={theme.primary}
                  name={showCompletedEvents ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={18}
                />
              </Pressable>
            </View>
            <View style={styles.completedEventsBody}>
              {(showCompletedEvents || isHidingCompletedEvents) && visibleCompletedPeriodEvents.length > 0 ? (
                visibleCompletedPeriodEvents.map((event) => (
                  <Animated.View
                    key={`completed-event-${event.id}`}
                    layout={LinearTransition.duration(220)}
                    entering={FadeInDown.duration(COMPLETED_DROPDOWN_OPEN_MS).easing(Easing.out(Easing.cubic))}
                    exiting={FadeOutDown.duration(COMPLETED_DROPDOWN_CLOSE_MS).easing(Easing.inOut(Easing.cubic))}>
                    {renderEventRow(event, true)}
                  </Animated.View>
                ))
              ) : showCompletedEvents ? (
                <Text style={styles.completedEventsEmpty}>{t('calendar.noCompletedEvents')}</Text>
              ) : showCompletedEventsHiddenHint ? (
                <Animated.View entering={FadeIn.duration(170).easing(Easing.out(Easing.quad))}>
                  <Text style={styles.completedCollapsedHint}>{t('calendar.completedHidden')}</Text>
                </Animated.View>
              ) : null}
            </View>
          </AppCard>
        </>
      ) : null}

      <Modal animationType="fade" transparent visible={Boolean(selectedEvent)}>
        <Pressable onPress={() => setSelectedEvent(null)} style={styles.detailBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View
                style={[
                  styles.detailColorRail,
                  { backgroundColor: selectedEvent?.categoryColor ?? '#4C6FFF' },
                ]}
              />
              <View style={styles.detailHeadingBlock}>
                <Text style={styles.detailTitle}>{selectedEvent?.title ?? t('calendar.eventFallbackTitle')}</Text>
                <View style={styles.detailTagRow}>
                  <View style={styles.detailTag}>
                    <Text style={styles.detailTagText}>
                      {localizeTaskCategoryName(selectedEvent?.categoryName ?? t('calendar.uncategorized'), effectiveLanguage)}
                    </Text>
                  </View>
                  {selectedEvent?.repeatable ? (
                    <View style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{t('calendar.repeats')}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={() => setSelectedEvent(null)} style={styles.detailClose}>
                <AppIcon color="#5E6883" name="close" size={18} />
              </Pressable>
            </View>

            <View style={styles.detailInfoCard}>
              <View style={styles.detailInfoRow}>
                <AppIcon color="#667291" name="schedule" size={16} />
                <Text style={styles.detailInfoText}>
                  {selectedEvent
                    ? formatEventDateTimeRange(selectedEvent.scheduledAt, selectedEvent.durationMinutes, localeTag, t)
                    : ''}
                </Text>
              </View>
              <View style={styles.detailInfoRow}>
                <AppIcon color="#667291" name="timelapse" size={16} />
                <Text style={styles.detailInfoText}>
                  {selectedEvent ? formatDurationLabel(selectedEvent.durationMinutes, localeTag, t) : ''}
                </Text>
              </View>
              {selectedEvent?.notes ? (
                <View style={styles.detailNotesBox}>
                  <Text style={styles.detailNotes}>{selectedEvent.notes}</Text>
                </View>
              ) : (
                <Text style={styles.detailNotesMuted}>{t('common.noNotes')}</Text>
              )}
            </View>

            <View style={styles.detailActions}>
              <Pressable onPress={() => setSelectedEvent(null)} style={styles.detailActionGhost}>
                <Text style={styles.detailActionGhostText}>{t('common.close')}</Text>
              </Pressable>
              <Pressable
                onPress={handleEditSelectedEvent}
                style={[styles.detailActionPrimary, { backgroundColor: theme.primary }]}>
                <AppIcon color="#FFFFFF" name="edit" size={16} />
                <Text style={styles.detailActionPrimaryText}>{t('calendar.editEvent')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    position: 'relative',
  },
  modeRow: {
    minHeight: 42,
    justifyContent: 'center',
  },
  periodNavRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EDFA',
  },
  modeTrigger: {
    position: 'relative',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E8EDFA',
  },
  modeAnchor: {
    position: 'relative',
    minHeight: 42,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'flex-start',
  },
  modeTriggerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#233253',
    letterSpacing: 0.2,
  },
  periodText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#6A738D',
    fontWeight: '700',
  },
  modeMenuPopover: {
    position: 'absolute',
    left: MODE_MENU_POPOVER_LEFT,
    right: 0,
    top: 0,
    height: 42,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    zIndex: 30,
    shadowOpacity: 0,
    elevation: 0,
  },
  modeMenuScroll: {
    flex: 1,
  },
  modeMenuScrollContent: {
    alignItems: 'center',
    gap: MODE_MENU_PILL_GAP,
    paddingRight: 6,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9E0F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    height: 42,
  },
  modePillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2133',
  },
  modeGlyphList: {
    width: 14,
    height: 12,
    justifyContent: 'space-between',
  },
  modeGlyphLine: {
    height: 2,
    borderRadius: 99,
  },
  modeGlyphBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 12,
  },
  modeGlyphBar: {
    width: 3,
    height: 10,
    borderRadius: 99,
  },
  modeGlyphBarDay: {
    width: 4,
    height: 12,
    borderRadius: 99,
  },
  modeGlyphBarWeek: {
    width: 2,
  },
  modeGlyphGridMonth: {
    width: 14,
    height: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  modeGlyphCellMonth: {
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  modeGlyphGridYear: {
    width: 14,
    height: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  modeGlyphCellYear: {
    width: 3,
    height: 3,
    borderRadius: 1,
  },
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
  timelineWrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: TIMELINE_WRAP_PADDING,
    gap: 8,
    overflow: 'hidden',
  },
  dayModeSingleRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayModeSinglePill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 110,
  },
  dayModeSingleWeekday: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayModeSingleDate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2133',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeRailSpacer: {
    width: TIMELINE_RAIL_WIDTH,
  },
  timelineDayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  timelineWeekday: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7180A0',
    textTransform: 'uppercase',
  },
  timelineDayBadge: {
    minWidth: 30,
    borderRadius: 999,
    backgroundColor: '#EEF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  timelineDayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D2844',
  },
  timelineDayBadgeTextToday: {
    color: '#FFFFFF',
  },
  timelineBody: {
    flexDirection: 'row',
  },
  timeRail: {
    width: TIMELINE_RAIL_WIDTH,
    position: 'relative',
    alignItems: 'center',
  },
  timeRailText: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    color: '#7A8399',
    fontWeight: '600',
  },
  timelineColumnsWrap: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E9F7',
    backgroundColor: '#FDFEFF',
  },
  timelineDayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#EDF2FA',
    position: 'relative',
  },
  nowIndicatorLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 25,
  },
  nowIndicatorDot: {
    position: 'absolute',
    left: -6,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  timelineHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  timelineEventBlock: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  timelineEventTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timelineEventMeta: {
    marginTop: 1,
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
  },
  monthWrap: {
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  monthHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2133',
  },
  monthHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#415072',
  },
  gridWeekHeader: {
    flexDirection: 'row',
  },
  gridWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#6D7792',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  monthCell: {
    width: `${100 / 7}%`,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
    paddingVertical: 6,
  },
  monthCellMuted: {
    opacity: 0.4,
  },
  monthCellToday: {
    borderWidth: 1,
  },
  monthCellSelected: {
    backgroundColor: '#2F52D0',
    borderColor: '#2F52D0',
  },
  monthCellText: {
    fontSize: 14,
    color: '#1A2133',
    fontWeight: '700',
  },
  monthCellTextMuted: {
    color: '#7D879F',
  },
  monthCellTextSelected: {
    color: '#FFFFFF',
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#3A86FF',
  },
  monthDotHidden: {
    opacity: 0,
  },
  monthDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  yearMonthCard: {
    width: '31.5%',
    borderRadius: 9,
    backgroundColor: '#F7F9FE',
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 3,
  },
  yearMonthTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A2133',
    textAlign: 'center',
  },
  miniWeekHeader: {
    flexDirection: 'row',
  },
  miniWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    color: '#7D879F',
  },
  miniMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniMonthDay: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 12,
    borderRadius: 3,
    paddingVertical: 0,
  },
  miniMonthDayMuted: {
    opacity: 0.35,
  },
  miniMonthDayEvent: {
    backgroundColor: 'rgba(47, 82, 208, 0.08)',
  },
  miniMonthDaySelected: {
    backgroundColor: 'rgba(47, 82, 208, 0.12)',
  },
  miniMonthDayText: {
    textAlign: 'center',
    fontSize: 8,
    color: '#415072',
    lineHeight: 11,
    fontWeight: '600',
  },
  miniMonthDayTextMuted: {
    color: 'transparent',
  },
  miniMonthDayTextEvent: {
    color: '#2F52D0',
    fontWeight: '800',
  },
  miniMonthDayToday: {
    borderWidth: 1,
    borderRadius: 3,
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
  completedEventsSection: {
    marginTop: 4,
    gap: 8,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  completedEventsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F6F9FF',
  },
  completedEventsToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completedEventsEmpty: {
    fontSize: 13,
    color: '#707A95',
    fontWeight: '600',
  },
  completedCollapsedHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#707A95',
  },
  completedEventsBody: {
    gap: 8,
    overflow: 'hidden',
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
  eventRowCompleted: {
    backgroundColor: '#F1F5FC',
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
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 30, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  detailCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailColorRail: {
    width: 8,
    minHeight: 58,
    borderRadius: 999,
  },
  detailHeadingBlock: {
    flex: 1,
    gap: 8,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2133',
    lineHeight: 29,
  },
  detailTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EEF2FA',
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#506080',
  },
  detailClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5FC',
  },
  detailInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EAF6',
    backgroundColor: '#F9FBFF',
    padding: 12,
    gap: 8,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailInfoText: {
    fontSize: 14,
    color: '#4F5A78',
    fontWeight: '700',
  },
  detailNotesBox: {
    marginTop: 2,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#EEF2FA',
  },
  detailNotes: {
    fontSize: 13,
    color: '#506080',
    lineHeight: 20,
  },
  detailNotesMuted: {
    marginTop: 2,
    fontSize: 12,
    color: '#7C88A3',
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionGhost: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE4F2',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    backgroundColor: '#F7F9FE',
  },
  detailActionGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F5A78',
  },
  detailActionPrimary: {
    flex: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    flexDirection: 'row',
    gap: 6,
  },
  detailActionPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
