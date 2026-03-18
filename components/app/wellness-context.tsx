import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { useAuth } from './auth-context';
import { db } from './firebase-client';
import { recoverFirestoreNetwork, withFirestoreTimeout } from './firestore-utils';

export type ExerciseSessionDraft = {
  name: string;
  categoryId: string;
  durationMinutes: number;
  calories: number;
  metLabel: string;
  caloriesPerHour: number;
  exerciseTemplateId?: string | null;
  createdAt?: number;
};

export type ExerciseSession = ExerciseSessionDraft & {
  id: string;
  createdAt: number;
};

export type DietMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DietEntryDraft = {
  name: string;
  categoryId: string;
  mealType: DietMealType;
  servingLabel: string;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  foodTemplateId?: string | null;
  createdAt?: number;
};

export type DietEntry = DietEntryDraft & {
  id: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  createdAt: number;
};

export type DietSummary = {
  targetCalories: number;
  consumedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  waterMl: number;
};

export type DashboardCardId = 'weather' | 'exercise' | 'diet' | 'tasks' | 'hydration' | 'habit';

export type ExerciseSettings = {
  weightKg: number;
  targetCalories: number;
};

const DASHBOARD_CARD_ORDER: DashboardCardId[] = ['weather', 'exercise', 'diet', 'tasks', 'hydration', 'habit'];
const DEFAULT_DASHBOARD_CARDS: DashboardCardId[] = ['weather', 'exercise', 'diet', 'tasks'];
const DEFAULT_EXERCISE_SETTINGS: ExerciseSettings = {
  weightKg: 70,
  targetCalories: 650,
};
const DEFAULT_DIET_SUMMARY: DietSummary = {
  targetCalories: 2100,
  consumedCalories: 1240,
  proteinGrams: 92,
  carbsGrams: 158,
  fatGrams: 46,
  waterMl: 1100,
};
const MAX_EXERCISE_SESSIONS = 240;
const MAX_DIET_ENTRIES = 480;

type PersistedWellnessState = {
  exerciseSessions: ExerciseSession[];
  exerciseSettings: ExerciseSettings;
  dietEntries: DietEntry[];
  dietSummary: DietSummary;
  dashboardCards: DashboardCardId[];
};

type WellnessContextValue = {
  isHydrated: boolean;
  exerciseSessions: ExerciseSession[];
  todayExerciseSessions: ExerciseSession[];
  todayExerciseCalories: number;
  exerciseWeightKg: number;
  exerciseGoalCalories: number;
  dietEntries: DietEntry[];
  todayDietEntries: DietEntry[];
  dietSummary: DietSummary;
  dashboardCards: DashboardCardId[];
  hiddenDashboardCards: DashboardCardId[];
  addExerciseSession: (draft: ExerciseSessionDraft) => ExerciseSession;
  updateExerciseSession: (sessionId: string, draft: ExerciseSessionDraft) => void;
  deleteExerciseSession: (sessionId: string) => void;
  updateExerciseSettings: (updates: Partial<ExerciseSettings>) => void;
  addDietEntry: (draft: DietEntryDraft) => DietEntry;
  updateDietEntry: (entryId: string, draft: DietEntryDraft) => void;
  deleteDietEntry: (entryId: string) => void;
  updateDietSummary: (updates: Partial<DietSummary>) => void;
  showDashboardCard: (cardId: DashboardCardId) => void;
  hideDashboardCard: (cardId: DashboardCardId) => void;
  moveDashboardCard: (cardId: DashboardCardId, direction: 'up' | 'down') => void;
};

const WellnessContext = createContext<WellnessContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function sortSessionsDesc<T extends { createdAt: number }>(sessions: T[]) {
  return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
}

function sanitizeDashboardCards(cards: DashboardCardId[] | null | undefined) {
  const source = Array.isArray(cards) ? cards : DEFAULT_DASHBOARD_CARDS;
  const deduped = source.filter((cardId, index) => source.indexOf(cardId) === index && DASHBOARD_CARD_ORDER.includes(cardId));
  return deduped.length > 0 ? deduped : DEFAULT_DASHBOARD_CARDS;
}

function todayKeyFromDate(value: number) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function roundNonNegative(value: number) {
  return Math.max(0, Math.round(value));
}

function toDietEntry(draft: DietEntryDraft, existing?: DietEntry): DietEntry {
  const servings = Math.max(0.25, Number.isFinite(draft.servings) ? draft.servings : 1);
  const caloriesPerServing = roundNonNegative(draft.caloriesPerServing);
  const proteinPerServing = roundNonNegative(draft.proteinPerServing);
  const carbsPerServing = roundNonNegative(draft.carbsPerServing);
  const fatPerServing = roundNonNegative(draft.fatPerServing);

  return {
    id: existing?.id ?? createId('food'),
    name: draft.name,
    categoryId: draft.categoryId || 'custom',
    mealType: draft.mealType,
    servingLabel: draft.servingLabel,
    servings,
    caloriesPerServing,
    proteinPerServing,
    carbsPerServing,
    fatPerServing,
    calories: roundNonNegative(caloriesPerServing * servings),
    proteinGrams: roundNonNegative(proteinPerServing * servings),
    carbsGrams: roundNonNegative(carbsPerServing * servings),
    fatGrams: roundNonNegative(fatPerServing * servings),
    foodTemplateId: draft.foodTemplateId ?? null,
    createdAt: draft.createdAt ?? existing?.createdAt ?? Date.now(),
  };
}

function recalculateDietSummary(entries: DietEntry[], baseSummary: DietSummary): DietSummary {
  return {
    ...baseSummary,
    consumedCalories: entries.reduce((sum, entry) => sum + entry.calories, 0),
    proteinGrams: entries.reduce((sum, entry) => sum + entry.proteinGrams, 0),
    carbsGrams: entries.reduce((sum, entry) => sum + entry.carbsGrams, 0),
    fatGrams: entries.reduce((sum, entry) => sum + entry.fatGrams, 0),
  };
}

function trimPersistedWellnessState(state: PersistedWellnessState): PersistedWellnessState {
  const exerciseSessions = sortSessionsDesc(state.exerciseSessions).slice(0, MAX_EXERCISE_SESSIONS);
  const dietEntries = sortSessionsDesc(state.dietEntries).slice(0, MAX_DIET_ENTRIES);

  return {
    ...state,
    exerciseSessions,
    dietEntries,
    dietSummary: recalculateDietSummary(dietEntries, state.dietSummary),
  };
}

function normalizePersistedState(raw: Partial<PersistedWellnessState> | null | undefined): PersistedWellnessState {
  const exerciseSessions = Array.isArray(raw?.exerciseSessions)
    ? raw.exerciseSessions
        .filter((session): session is ExerciseSession => Boolean(session && typeof session.id === 'string' && typeof session.name === 'string'))
        .map((session) => ({
          id: session.id,
          name: session.name,
          categoryId: session.categoryId || 'custom',
          durationMinutes: Math.max(1, Math.round(Number(session.durationMinutes) || 1)),
          calories: Math.max(0, Math.round(Number(session.calories) || 0)),
          metLabel: session.metLabel || 'Custom kcal/h',
          caloriesPerHour: Math.max(0, Math.round(Number(session.caloriesPerHour) || 0)),
          exerciseTemplateId: session.exerciseTemplateId ?? null,
          createdAt: Number.isFinite(session.createdAt) ? Number(session.createdAt) : Date.now(),
        }))
    : [];

  const dietSummaryBase: DietSummary = {
    targetCalories: Math.max(1200, Math.round(Number(raw?.dietSummary?.targetCalories) || DEFAULT_DIET_SUMMARY.targetCalories)),
    consumedCalories: Math.max(0, Math.round(Number(raw?.dietSummary?.consumedCalories) || DEFAULT_DIET_SUMMARY.consumedCalories)),
    proteinGrams: Math.max(0, Math.round(Number(raw?.dietSummary?.proteinGrams) || DEFAULT_DIET_SUMMARY.proteinGrams)),
    carbsGrams: Math.max(0, Math.round(Number(raw?.dietSummary?.carbsGrams) || DEFAULT_DIET_SUMMARY.carbsGrams)),
    fatGrams: Math.max(0, Math.round(Number(raw?.dietSummary?.fatGrams) || DEFAULT_DIET_SUMMARY.fatGrams)),
    waterMl: Math.max(0, Math.round(Number(raw?.dietSummary?.waterMl) || DEFAULT_DIET_SUMMARY.waterMl)),
  };

  const dietEntries = Array.isArray(raw?.dietEntries)
    ? raw.dietEntries
        .filter((entry): entry is DietEntry => Boolean(entry && typeof entry.id === 'string' && typeof entry.name === 'string'))
        .map((entry) =>
          toDietEntry(
            {
              name: entry.name,
              categoryId: entry.categoryId || 'custom',
              mealType: (entry.mealType as DietMealType) || 'dinner',
              servingLabel: entry.servingLabel || '1 serving',
              servings: Number(entry.servings) || 1,
              caloriesPerServing: Number(entry.caloriesPerServing) || Number(entry.calories) || 0,
              proteinPerServing: Number(entry.proteinPerServing) || Number(entry.proteinGrams) || 0,
              carbsPerServing: Number(entry.carbsPerServing) || Number(entry.carbsGrams) || 0,
              fatPerServing: Number(entry.fatPerServing) || Number(entry.fatGrams) || 0,
              foodTemplateId: entry.foodTemplateId ?? null,
              createdAt: Number.isFinite(entry.createdAt) ? Number(entry.createdAt) : Date.now(),
            },
            {
              ...entry,
              calories: Number(entry.calories) || 0,
              proteinGrams: Number(entry.proteinGrams) || 0,
              carbsGrams: Number(entry.carbsGrams) || 0,
              fatGrams: Number(entry.fatGrams) || 0,
            }
          )
        )
    : [];

  return trimPersistedWellnessState({
    exerciseSessions: sortSessionsDesc(exerciseSessions),
    exerciseSettings: {
      weightKg: Math.max(20, Math.round(Number(raw?.exerciseSettings?.weightKg) || DEFAULT_EXERCISE_SETTINGS.weightKg)),
      targetCalories: Math.max(
        50,
        Math.round(Number(raw?.exerciseSettings?.targetCalories) || DEFAULT_EXERCISE_SETTINGS.targetCalories)
      ),
    },
    dietEntries: sortSessionsDesc(dietEntries),
    dietSummary: dietEntries.length > 0 ? recalculateDietSummary(dietEntries, dietSummaryBase) : dietSummaryBase,
    dashboardCards: sanitizeDashboardCards(raw?.dashboardCards),
  });
}

async function saveWellnessState(userId: string, state: PersistedWellnessState) {
  if (!db) {
    return;
  }

  try {
    await withFirestoreTimeout(
      setDoc(
        doc(db, 'users', userId),
        {
          wellness: state,
          updatedAt: Date.now(),
        },
        { merge: true }
      ),
      8000,
      'Timed out while waiting for Cloud Firestore to save wellness data.'
    );
  } catch (firstError) {
    if (firstError instanceof Error && firstError.message.toLowerCase().includes('timed out')) {
      throw firstError;
    }
    await recoverFirestoreNetwork(db);
    await withFirestoreTimeout(
      setDoc(
        doc(db, 'users', userId),
        {
          wellness: state,
          updatedAt: Date.now(),
        },
        { merge: true }
      ),
      8000,
      'Timed out while waiting for Cloud Firestore to save wellness data.'
    );
    if (__DEV__) {
      console.warn('Wellness save recovered after retry', firstError);
    }
  }
}

export function WellnessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [listenerRetryTick, setListenerRetryTick] = useState(0);
  const [state, setState] = useState<PersistedWellnessState>(() => normalizePersistedState(null));
  const lastSerializedRef = useRef('');
  const pendingSerializedRef = useRef('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const firestore = db;

    if (!user || !firestore) {
      setState(normalizePersistedState(null));
      setIsHydrated(true);
      lastSerializedRef.current = '';
      pendingSerializedRef.current = '';
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    setState(normalizePersistedState(null));
    setIsHydrated(false);
    lastSerializedRef.current = '';
    pendingSerializedRef.current = '';
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    let isDisposed = false;

    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.id),
      (snapshot) => {
        if (isDisposed) {
          return;
        }
        const profile = snapshot.data() as { wellness?: Partial<PersistedWellnessState> } | undefined;
        const next = normalizePersistedState(profile?.wellness);
        const serialized = JSON.stringify(next);
        lastSerializedRef.current = serialized;
        pendingSerializedRef.current = '';
        setState(next);
        setIsHydrated(true);
      },
      (error) => {
        console.error('Failed to observe wellness state', error);
        void recoverFirestoreNetwork(firestore);
        if (!isDisposed) {
          setTimeout(() => {
            setListenerRetryTick((previous) => previous + 1);
          }, 1500);
        }
        setIsHydrated(true);
      }
    );

    return () => {
      isDisposed = true;
      unsubscribe();
    };
  }, [listenerRetryTick, user]);

  useEffect(() => {
    if (!user || !db || !isHydrated) {
      return;
    }

    const stateForStorage = trimPersistedWellnessState(state);
    const serialized = JSON.stringify(stateForStorage);
    if (serialized === lastSerializedRef.current) {
      return;
    }

    if (serialized === pendingSerializedRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSerializedRef.current = serialized;
      void saveWellnessState(user.id, stateForStorage)
        .then(() => {
          lastSerializedRef.current = serialized;
        })
        .catch((error) => {
          console.error('Failed to save wellness state', error);
        })
        .finally(() => {
          if (pendingSerializedRef.current === serialized) {
            pendingSerializedRef.current = '';
          }
        });
    }, 750);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isHydrated, state, user]);

  const addExerciseSession = (draft: ExerciseSessionDraft) => {
    const session: ExerciseSession = {
      ...draft,
      id: createId('session'),
      exerciseTemplateId: draft.exerciseTemplateId ?? null,
      createdAt: draft.createdAt ?? Date.now(),
    };

    setState((previous) => ({
      ...previous,
      exerciseSessions: sortSessionsDesc([session, ...previous.exerciseSessions]),
    }));

    return session;
  };

  const updateExerciseSession = (sessionId: string, draft: ExerciseSessionDraft) => {
    setState((previous) => ({
      ...previous,
      exerciseSessions: sortSessionsDesc(
        previous.exerciseSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                ...draft,
                exerciseTemplateId: draft.exerciseTemplateId ?? null,
                createdAt: draft.createdAt ?? session.createdAt,
              }
            : session
        )
      ),
    }));
  };

  const deleteExerciseSession = (sessionId: string) => {
    setState((previous) => ({
      ...previous,
      exerciseSessions: previous.exerciseSessions.filter((session) => session.id !== sessionId),
    }));
  };

  const updateExerciseSettings = (updates: Partial<ExerciseSettings>) => {
    setState((previous) => ({
      ...previous,
      exerciseSettings: {
        ...previous.exerciseSettings,
        ...updates,
      },
    }));
  };

  const addDietEntry = (draft: DietEntryDraft) => {
    const entry = toDietEntry(draft);

    setState((previous) => {
      const dietEntries = sortSessionsDesc([entry, ...previous.dietEntries]);
      return {
        ...previous,
        dietEntries,
        dietSummary: recalculateDietSummary(dietEntries, previous.dietSummary),
      };
    });

    return entry;
  };

  const updateDietEntry = (entryId: string, draft: DietEntryDraft) => {
    setState((previous) => {
      const dietEntries = sortSessionsDesc(
        previous.dietEntries.map((entry) => (entry.id === entryId ? toDietEntry(draft, entry) : entry))
      );

      return {
        ...previous,
        dietEntries,
        dietSummary: recalculateDietSummary(dietEntries, previous.dietSummary),
      };
    });
  };

  const deleteDietEntry = (entryId: string) => {
    setState((previous) => {
      const dietEntries = previous.dietEntries.filter((entry) => entry.id !== entryId);
      return {
        ...previous,
        dietEntries,
        dietSummary: recalculateDietSummary(dietEntries, previous.dietSummary),
      };
    });
  };

  const updateDietSummary = (updates: Partial<DietSummary>) => {
    setState((previous) => ({
      ...previous,
      dietSummary: {
        ...previous.dietSummary,
        ...updates,
      },
    }));
  };

  const showDashboardCard = (cardId: DashboardCardId) => {
    setState((previous) => {
      if (previous.dashboardCards.includes(cardId)) {
        return previous;
      }
      const nextCards = DASHBOARD_CARD_ORDER.filter((candidate) =>
        candidate === cardId || previous.dashboardCards.includes(candidate)
      );
      return {
        ...previous,
        dashboardCards: nextCards,
      };
    });
  };

  const hideDashboardCard = (cardId: DashboardCardId) => {
    setState((previous) => {
      if (!previous.dashboardCards.includes(cardId) || previous.dashboardCards.length <= 1) {
        return previous;
      }
      return {
        ...previous,
        dashboardCards: previous.dashboardCards.filter((candidate) => candidate !== cardId),
      };
    });
  };

  const moveDashboardCard = (cardId: DashboardCardId, direction: 'up' | 'down') => {
    setState((previous) => {
      const currentIndex = previous.dashboardCards.indexOf(cardId);
      if (currentIndex === -1) {
        return previous;
      }
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= previous.dashboardCards.length) {
        return previous;
      }
      const nextCards = [...previous.dashboardCards];
      const [moved] = nextCards.splice(currentIndex, 1);
      nextCards.splice(nextIndex, 0, moved);
      return {
        ...previous,
        dashboardCards: nextCards,
      };
    });
  };

  const todayExerciseSessions = useMemo(() => {
    const todayKey = todayKeyFromDate(Date.now());
    return state.exerciseSessions.filter((session) => todayKeyFromDate(session.createdAt) === todayKey);
  }, [state.exerciseSessions]);

  const todayExerciseCalories = useMemo(
    () => todayExerciseSessions.reduce((sum, session) => sum + session.calories, 0),
    [todayExerciseSessions]
  );

  const todayDietEntries = useMemo(() => {
    const todayKey = todayKeyFromDate(Date.now());
    return state.dietEntries.filter((entry) => todayKeyFromDate(entry.createdAt) === todayKey);
  }, [state.dietEntries]);

  const hiddenDashboardCards = useMemo(
    () => DASHBOARD_CARD_ORDER.filter((cardId) => !state.dashboardCards.includes(cardId)),
    [state.dashboardCards]
  );

  const value = useMemo<WellnessContextValue>(
    () => ({
      isHydrated,
      exerciseSessions: state.exerciseSessions,
      todayExerciseSessions,
      todayExerciseCalories,
      exerciseWeightKg: state.exerciseSettings.weightKg,
      exerciseGoalCalories: state.exerciseSettings.targetCalories,
      dietEntries: state.dietEntries,
      todayDietEntries,
      dietSummary: state.dietSummary,
      dashboardCards: state.dashboardCards,
      hiddenDashboardCards,
      addExerciseSession,
      updateExerciseSession,
      deleteExerciseSession,
      updateExerciseSettings,
      addDietEntry,
      updateDietEntry,
      deleteDietEntry,
      updateDietSummary,
      showDashboardCard,
      hideDashboardCard,
      moveDashboardCard,
    }),
    [
      hiddenDashboardCards,
      isHydrated,
      state.dashboardCards,
      state.dietEntries,
      state.dietSummary,
      state.exerciseSessions,
      state.exerciseSettings,
      todayDietEntries,
      todayExerciseCalories,
      todayExerciseSessions,
    ]
  );

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness() {
  const context = useContext(WellnessContext);

  if (!context) {
    throw new Error('useWellness must be used inside a WellnessProvider');
  }

  return context;
}
