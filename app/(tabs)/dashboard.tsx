import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppCard, ScreenShell, SectionLabel } from '@/components/app/screen-shell';
import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { type DashboardCardId, useWellness } from '@/components/app/wellness-context';
import { useTasks } from '@/components/app/tasks-context';
import { AppIcon } from '@/components/ui/app-icon';

type WeatherSnapshot = {
  city: string;
  temperature: number;
  windSpeed: number;
  description: string;
};

type DashboardCardConfig = {
  id: DashboardCardId;
  icon: string;
  accent: string;
  size: 'full' | 'half';
};

const CARD_CONFIG: Record<DashboardCardId, DashboardCardConfig> = {
  weather: {
    id: 'weather',
    icon: 'wb-sunny',
    accent: '#5A80F7',
    size: 'full',
  },
  exercise: {
    id: 'exercise',
    icon: 'directions-run',
    accent: '#2CB67D',
    size: 'half',
  },
  diet: {
    id: 'diet',
    icon: 'restaurant',
    accent: '#FF9F43',
    size: 'half',
  },
  tasks: {
    id: 'tasks',
    icon: 'checklist',
    accent: '#4361EE',
    size: 'half',
  },
  hydration: {
    id: 'hydration',
    icon: 'water-drop',
    accent: '#2CA7FF',
    size: 'half',
  },
  habit: {
    id: 'habit',
    icon: 'stars',
    accent: '#8B5CF6',
    size: 'half',
  },
};

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Foggy',
  48: 'Frost fog',
  51: 'Light drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  80: 'Rain showers',
  95: 'Thunderstorms',
};

function formatShortDate(localeTag: string) {
  return new Intl.DateTimeFormat(localeTag, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
}

function formatShortTime(localeTag: string) {
  return new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function buildCardRows(cardIds: DashboardCardId[]) {
  const rows: DashboardCardId[][] = [];
  let currentHalfRow: DashboardCardId[] = [];

  for (const cardId of cardIds) {
    const config = CARD_CONFIG[cardId];
    if (config.size === 'full') {
      if (currentHalfRow.length > 0) {
        rows.push(currentHalfRow);
        currentHalfRow = [];
      }
      rows.push([cardId]);
      continue;
    }

    currentHalfRow.push(cardId);
    if (currentHalfRow.length === 2) {
      rows.push(currentHalfRow);
      currentHalfRow = [];
    }
  }

  if (currentHalfRow.length > 0) {
    rows.push(currentHalfRow);
  }

  return rows;
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { localeTag, t } = useLanguage();
  const { theme } = useAppTheme();
  const { tasks } = useTasks();
  const {
    dashboardCards,
    dietSummary,
    exerciseGoalCalories,
    hiddenDashboardCards,
    hideDashboardCard,
    moveDashboardCard,
    showDashboardCard,
    todayExerciseCalories,
    todayExerciseSessions,
  } = useWellness();
  const [isEditingCards, setIsEditingCards] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherMessage, setWeatherMessage] = useState(t('dashboard.weather.loading'));

  useEffect(() => {
    let isActive = true;

    async function loadWeather() {
      try {
        setWeatherMessage(t('dashboard.weather.loading'));
        const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!servicesEnabled) {
          if (Platform.OS === 'android') {
            await Location.enableNetworkProviderAsync().catch(() => undefined);
          }

          const servicesEnabledAfterPrompt = await Location.hasServicesEnabledAsync().catch(() => false);
          if (!servicesEnabledAfterPrompt) {
            if (isActive) {
              setWeather(null);
              setWeatherMessage(t('dashboard.weather.enableServices'));
            }
            return;
          }
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (isActive) {
            setWeather(null);
            setWeatherMessage(t('dashboard.weather.allow'));
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const [reverseGeo] = await Location.reverseGeocodeAsync(position.coords);
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
        );
        const data = (await response.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
        };

        if (!isActive || !data.current || typeof data.current.temperature_2m !== 'number') {
          return;
        }

        const placeBits = [reverseGeo?.city, reverseGeo?.district, reverseGeo?.region].filter(Boolean);
        setWeather({
          city: placeBits[0] || t('dashboard.weather.area'),
          temperature: Math.round(data.current.temperature_2m),
          windSpeed: Math.round(data.current.wind_speed_10m ?? 0),
          description: WEATHER_CODE_MAP[data.current.weather_code ?? 0] || 'Fresh conditions',
        });
      } catch (error) {
        console.error('Failed to load weather', error);
        if (isActive) {
          setWeather(null);
          setWeatherMessage(t('dashboard.weather.unavailable'));
        }
      }
    }

    void loadWeather();

    return () => {
      isActive = false;
    };
  }, [t]);

  const activeTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.done), [tasks]);
  const dueTodayCount = useMemo(() => {
    const today = new Date();
    return activeTasks.filter((task) => {
      const date = new Date(task.scheduledAt);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;
  }, [activeTasks]);
  const taskProgressPercent = tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100);
  const remainingCalories = Math.max(0, dietSummary.targetCalories - dietSummary.consumedCalories);
  const dietProgressPercent =
    dietSummary.targetCalories <= 0
      ? 0
      : Math.min(100, Math.round((dietSummary.consumedCalories / dietSummary.targetCalories) * 100));
  const exercisePercent = Math.min(100, Math.round((todayExerciseCalories / exerciseGoalCalories) * 100));
  const habitScore = Math.min(
    100,
    Math.round(
      Math.min(1, todayExerciseCalories / Math.max(exerciseGoalCalories, 1)) * 45 +
        Math.min(1, dietSummary.waterMl / 1800) * 20 +
        Math.min(1, completedTasks.length / Math.max(tasks.length || 1, 1)) * 35
    )
  );
  const shouldStackRows = width < 350;
  const cardRows = buildCardRows(dashboardCards);

  const titleForCard = (cardId: DashboardCardId) => {
    switch (cardId) {
      case 'weather':
        return t('dashboard.weather.title');
      case 'exercise':
        return t('dashboard.exercise.title');
      case 'diet':
        return t('dashboard.diet.title');
      case 'tasks':
        return t('dashboard.tasks.title');
      case 'hydration':
        return t('dashboard.hydration.title');
      case 'habit':
        return t('dashboard.habit.title');
    }
  };

  const subtitleForCard = (cardId: DashboardCardId) => {
    switch (cardId) {
      case 'weather':
        return t('dashboard.weather.subtitle');
      case 'exercise':
        return t('dashboard.exercise.subtitle');
      case 'diet':
        return t('dashboard.diet.subtitle');
      case 'tasks':
        return t('dashboard.tasks.subtitle');
      case 'hydration':
        return t('dashboard.hydration.subtitle');
      case 'habit':
        return t('dashboard.habit.subtitle');
    }
  };

  const renderCard = (cardId: DashboardCardId) => {
    const config = CARD_CONFIG[cardId];
    const isFullWidth = config.size === 'full';

    return (
      <View key={cardId} style={[styles.cardSlot, isFullWidth ? styles.fullCardSlot : styles.halfCardSlot]}>
        <View
          style={[
            styles.dashboardCard,
            cardId === 'weather' && styles.weatherCard,
            { borderColor: `${config.accent}15` },
          ]}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleWrap}>
              <View style={[styles.cardBadge, { backgroundColor: `${config.accent}16` }]}>
                <AppIcon color={config.accent} name={config.icon} size={18} />
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.cardEyebrow}>{subtitleForCard(cardId)}</Text>
                <Text style={[styles.cardHeading, !isFullWidth && styles.cardHeadingCompact]}>{titleForCard(cardId)}</Text>
              </View>
            </View>
            {isEditingCards ? (
              <View style={styles.cardEditorActions}>
                <Pressable disabled={dashboardCards[0] === cardId} onPress={() => moveDashboardCard(cardId, 'up')} style={styles.orderButton}>
                  <AppIcon color="#54617F" name="keyboard-arrow-up" size={18} />
                </Pressable>
                <Pressable disabled={dashboardCards[dashboardCards.length - 1] === cardId} onPress={() => moveDashboardCard(cardId, 'down')} style={styles.orderButton}>
                  <AppIcon color="#54617F" name="keyboard-arrow-down" size={18} />
                </Pressable>
                <Pressable disabled={dashboardCards.length <= 1} onPress={() => hideDashboardCard(cardId)} style={styles.removeButton}>
                  <AppIcon color="#C7506A" name="remove" size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {cardId === 'weather' ? (
            weather ? (
              <View style={styles.weatherInfoRow}>
                <Text style={styles.weatherTemp}>{weather.temperature}°F</Text>
                <View style={styles.weatherMetaWrap}>
                  <Text style={styles.weatherMeta}>{t('dashboard.weather.cityLine', { description: weather.description, city: weather.city })}</Text>
                  <Text style={styles.weatherMeta}>{t('dashboard.weather.windLine', { windSpeed: weather.windSpeed, date: formatShortDate(localeTag), time: formatShortTime(localeTag) })}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.weatherInfoRow}>
                <Text style={styles.weatherTemp}>--</Text>
                <View style={styles.weatherMetaWrap}>
                  <Text style={styles.weatherMeta}>{weatherMessage}</Text>
                  <Text style={styles.weatherMeta}>{`${formatShortDate(localeTag)} · ${formatShortTime(localeTag)}`}</Text>
                </View>
              </View>
            )
          ) : null}

          {cardId === 'exercise' ? (
            <>
              <Text style={styles.metricValue}>{todayExerciseCalories} kcal</Text>
              <Text style={styles.metricMeta}>{t('dashboard.exercise.meta', { sessions: todayExerciseSessions.length, goal: exerciseGoalCalories })}</Text>
              <View style={styles.progressRow}>
                <View style={styles.inlineTrack}>
                  <View style={[styles.inlineFill, { width: `${exercisePercent}%`, backgroundColor: config.accent }]} />
                </View>
                <Text style={styles.progressPercent}>{exercisePercent}%</Text>
              </View>
            </>
          ) : null}

          {cardId === 'diet' ? (
            <>
              <Text style={styles.metricValue}>{remainingCalories} kcal</Text>
              <Text style={styles.metricMeta}>{t('dashboard.diet.meta', { consumed: dietSummary.consumedCalories, target: dietSummary.targetCalories })}</Text>
              <View style={styles.progressRow}>
                <View style={styles.inlineTrack}>
                  <View style={[styles.inlineFill, { width: `${dietProgressPercent}%`, backgroundColor: config.accent }]} />
                </View>
                <Text style={styles.progressPercent}>{dietProgressPercent}%</Text>
              </View>
            </>
          ) : null}

          {cardId === 'tasks' ? (
            <>
              <Text style={styles.metricValue}>{activeTasks.length}</Text>
              <Text style={styles.metricMeta}>{t('dashboard.tasks.meta', { active: activeTasks.length, due: dueTodayCount, done: completedTasks.length })}</Text>
              <View style={styles.progressRow}>
                <View style={styles.inlineTrack}>
                  <View style={[styles.inlineFill, { width: `${taskProgressPercent}%`, backgroundColor: config.accent }]} />
                </View>
                <Text style={styles.progressPercent}>{taskProgressPercent}%</Text>
              </View>
            </>
          ) : null}

          {cardId === 'hydration' ? (
            <>
              <Text style={styles.metricValue}>{dietSummary.waterMl} ml</Text>
              <Text style={styles.metricMeta}>{t('dashboard.hydration.meta1')}</Text>
              <Text style={styles.metricMeta}>{t('dashboard.hydration.meta2', { remaining: Math.max(0, 2200 - dietSummary.waterMl) })}</Text>
            </>
          ) : null}

          {cardId === 'habit' ? (
            <>
              <Text style={styles.metricValue}>{habitScore}%</Text>
              <Text style={styles.metricMeta}>{t('dashboard.habit.meta1')}</Text>
              <Text style={styles.metricMeta}>{t('dashboard.habit.meta2')}</Text>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenShell title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <AppCard delay={80}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <SectionLabel text={t('dashboard.spotlight')} />
            <Text style={styles.spotlightTagline}>{t('dashboard.spotlightTagline')}</Text>
          </View>
          <Pressable onPress={() => setIsEditingCards((previous) => !previous)} style={[styles.editCardsButton, { borderColor: `${theme.primary}30`, backgroundColor: `${theme.primary}10` }]}>
            <AppIcon color={theme.primary} name={isEditingCards ? 'close' : 'edit'} size={16} />
            <Text style={[styles.editCardsText, { color: theme.primary }]}>{isEditingCards ? t('dashboard.done') : t('dashboard.editCards')}</Text>
          </Pressable>
        </View>

        {cardRows.map((row, index) => (
          <View key={`${row.join('-')}-${index}`} style={[styles.dashboardRow, shouldStackRows && styles.dashboardRowStacked]}>
            {row.map((cardId) => renderCard(cardId))}
            {!shouldStackRows && row.length === 1 && CARD_CONFIG[row[0]]?.size === 'half' ? (
              <View style={[styles.cardSlot, styles.halfCardSlot]} />
            ) : null}
          </View>
        ))}
      </AppCard>

      {isEditingCards ? (
        <AppCard delay={130}>
          <SectionLabel text={t('dashboard.editSection')} />
          <Text style={styles.editorDescription}>{t('dashboard.editDescription')}</Text>
          <View style={styles.visibleGroup}>
            <Text style={styles.editorHeading}>{t('dashboard.showingNow')}</Text>
            {dashboardCards.map((cardId) => (
              <View key={cardId} style={styles.editorRow}>
                <View style={styles.editorRowCopy}>
                  <Text style={styles.editorRowTitle}>{titleForCard(cardId)}</Text>
                  <Text style={styles.editorRowMeta}>{subtitleForCard(cardId)}</Text>
                </View>
                <View style={styles.cardEditorActions}>
                  <Pressable disabled={dashboardCards[0] === cardId} onPress={() => moveDashboardCard(cardId, 'up')} style={styles.orderButton}>
                    <AppIcon color="#54617F" name="keyboard-arrow-up" size={18} />
                  </Pressable>
                  <Pressable disabled={dashboardCards[dashboardCards.length - 1] === cardId} onPress={() => moveDashboardCard(cardId, 'down')} style={styles.orderButton}>
                    <AppIcon color="#54617F" name="keyboard-arrow-down" size={18} />
                  </Pressable>
                  <Pressable disabled={dashboardCards.length <= 1} onPress={() => hideDashboardCard(cardId)} style={styles.removeButton}>
                    <AppIcon color="#C7506A" name="remove" size={18} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.hiddenGroup}>
            <Text style={styles.editorHeading}>{t('dashboard.hiddenCards')}</Text>
            {hiddenDashboardCards.length === 0 ? <Text style={styles.hiddenEmpty}>{t('dashboard.allVisible')}</Text> : null}
            <View style={styles.hiddenGrid}>
              {hiddenDashboardCards.map((cardId) => (
                <Pressable key={cardId} onPress={() => showDashboardCard(cardId)} style={styles.hiddenCardButton}>
                  <AppIcon color={CARD_CONFIG[cardId].accent} name={CARD_CONFIG[cardId].icon} size={18} />
                  <Text style={styles.hiddenCardText}>{titleForCard(cardId)}</Text>
                  <AppIcon color="#2CB67D" name="add-circle" size={18} />
                </Pressable>
              ))}
            </View>
          </View>
        </AppCard>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  spotlightTagline: {
    marginTop: 4,
    fontSize: 13,
    color: '#69728C',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  editCardsButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editCardsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  dashboardRowStacked: {
    flexDirection: 'column',
  },
  cardSlot: {
    minWidth: 0,
  },
  fullCardSlot: {
    flex: 1,
  },
  halfCardSlot: {
    flex: 1,
  },
  dashboardCard: {
    minHeight: 144,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    shadowColor: '#182031',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
    flex: 1,
  },
  weatherCard: {
    minHeight: 118,
    paddingVertical: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  cardBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardHeadingCopy: {
    flex: 1,
    gap: 2,
  },
  cardEyebrow: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    color: '#8A92A8',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2133',
    letterSpacing: -0.3,
  },
  cardHeadingCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  cardEditorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFF',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F1C7D2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F7',
  },
  weatherTemp: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1A2133',
    letterSpacing: -1,
  },
  weatherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  weatherMetaWrap: {
    flex: 1,
    gap: 6,
  },
  weatherMeta: {
    fontSize: 14,
    color: '#66708C',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A2133',
    letterSpacing: -0.8,
  },
  metricMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: '#66708C',
    fontWeight: '600',
  },
  inlineTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E7ECF8',
    overflow: 'hidden',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#61708B',
    minWidth: 34,
    textAlign: 'right',
  },
  inlineFill: {
    height: '100%',
    borderRadius: 999,
  },
  editorDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#66708C',
    fontWeight: '600',
  },
  visibleGroup: {
    gap: 10,
  },
  hiddenGroup: {
    gap: 10,
  },
  editorHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2133',
  },
  editorRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0F0',
    backgroundColor: '#FAFCFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  editorRowCopy: {
    flex: 1,
    gap: 2,
  },
  editorRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2133',
  },
  editorRowMeta: {
    fontSize: 12,
    color: '#67708C',
    fontWeight: '600',
  },
  hiddenGrid: {
    gap: 10,
  },
  hiddenCardButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E0F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hiddenCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2133',
  },
  hiddenEmpty: {
    fontSize: 13,
    color: '#69728C',
    fontWeight: '600',
  },
});
