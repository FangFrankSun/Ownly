import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

import { useAuth } from './auth-context';
import { auth, db } from './firebase-client';
import {
  getFirestoreErrorCode,
  recoverFirestoreNetwork,
  toFirestoreWriteErrorMessage,
  waitForFirestoreWriteSync,
  withFirestoreTimeout,
} from './firestore-utils';

export type TaskCategory = {
  id: string;
  name: string;
  color: string;
};

export type TaskItem = {
  id: string;
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  durationMinutes: number;
  repeatable: boolean;
  done: boolean;
  createdAt: number;
};

type TaskDraftInput = {
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  durationMinutes: number;
  repeatable: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  notes: string;
  scheduledAt: string;
  durationMinutes: number;
  repeatable: boolean;
  done: boolean;
  categoryName: string;
  categoryColor: string;
};

type SyncDebugState = {
  serverTaskCount: number | null;
  serverCategoryCount: number | null;
  lastServerSyncAt: number | null;
  lastServerSyncError: string | null;
  collectionPath: string | null;
};

type TasksContextValue = {
  categories: TaskCategory[];
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  syncDebug: SyncDebugState;
  isReady: boolean;
  addCategory: (name: string, color: string) => string;
  renameCategory: (categoryId: string, name: string) => void;
  updateCategoryColor: (categoryId: string, color: string) => void;
  deleteCategory: (categoryId: string) => void;
  addTask: (draft: TaskDraftInput) => Promise<TaskWriteResult>;
  updateTask: (taskId: string, draft: TaskDraftInput) => Promise<TaskWriteResult>;
  deleteTask: (taskId: string) => Promise<TaskWriteResult>;
  toggleTaskDone: (taskId: string) => Promise<TaskWriteResult>;
};

export type TaskWriteResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

type TaskStore = {
  categories: TaskCategory[];
  tasks: TaskItem[];
};

type RemoteTaskStore = TaskStore & {
  updatedAt: number;
};

const seedCategoryTemplate = [
  { name: 'Work', color: '#4C6FFF' },
  { name: 'Personal', color: '#FF8A4C' },
] as const;

const TasksContext = createContext<TasksContextValue | null>(null);
const FIRESTORE_TASK_ACTION_TIMEOUT_MS = 8000;
const FIRESTORE_TASK_ACK_TIMEOUT_MS = 12000;
const MIN_TASK_SERVER_WRITE_INTERVAL_MS = 1250;
const TRANSIENT_TASK_SYNC_RETRY_LIMIT = 3;
const TRANSIENT_TASK_SYNC_RETRY_DELAY_MS = 1500;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function normalizedDurationMinutes(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 60;
  }
  return Math.max(5, Math.min(24 * 60, Math.round(value as number)));
}

function readCreatedAt(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      const millis = toMillis.call(value);
      if (typeof millis === 'number' && Number.isFinite(millis)) {
        return millis;
      }
    }
  }

  return 0;
}

function buildSeedCategories(userId: string): TaskCategory[] {
  const short = userId.slice(0, 8);
  return seedCategoryTemplate.map((category, index) => ({
    id: `cat-${short}-${index}`,
    name: category.name,
    color: category.color,
  }));
}

function toCategory(raw: { id?: string; name?: string; color?: string }, fallbackId: string): TaskCategory {
  return {
    id: raw.id || fallbackId,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'General',
    color: typeof raw.color === 'string' && raw.color.trim() ? raw.color : '#4C6FFF',
  };
}

function toTask(raw: Partial<TaskItem> & { id?: string }, fallbackId: string): TaskItem {
  return {
    id: raw.id || fallbackId,
    title: typeof raw.title === 'string' ? raw.title : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : '',
    scheduledAt: normalizedTimestamp(typeof raw.scheduledAt === 'string' ? raw.scheduledAt : new Date().toISOString()),
    durationMinutes: normalizedDurationMinutes(raw.durationMinutes),
    repeatable: Boolean(raw.repeatable),
    done: Boolean(raw.done),
    createdAt: readCreatedAt(raw.createdAt),
  };
}

function normalizedCategoryNameKey(value: string) {
  return value.trim().toLowerCase();
}

function isLegacyWebHealthCategory(userId: string, category: TaskCategory) {
  const legacyHealthId = `cat-${userId.slice(0, 8)}-1`;
  return category.id === legacyHealthId && normalizedCategoryNameKey(category.name) === 'health';
}

function sortTasks(nextTasks: TaskItem[]) {
  return [...nextTasks].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

function normalizeTaskStore(userId: string, raw: Partial<TaskStore> | null | undefined): TaskStore {
  const categories = Array.isArray(raw?.categories)
    ? raw.categories.map((category, index) => toCategory(category, category?.id || `cat-local-${index}`))
    : [];
  const tasks = Array.isArray(raw?.tasks)
    ? sortTasks(raw.tasks.map((task, index) => toTask(task, task?.id || `task-local-${index}`)))
    : [];

  if (categories.length === 0) {
    return {
      categories: buildSeedCategories(userId),
      tasks,
    };
  }

  const legacyHealthCategory = categories.find((category) => isLegacyWebHealthCategory(userId, category));
  if (!legacyHealthCategory) {
    return {
      categories,
      tasks,
    };
  }

  const personalCategory = categories.find(
    (category) =>
      category.id !== legacyHealthCategory.id && normalizedCategoryNameKey(category.name) === 'personal'
  );
  if (!personalCategory) {
    return {
      categories,
      tasks,
    };
  }

  return {
    categories: categories.filter((category) => category.id !== legacyHealthCategory.id),
    tasks: sortTasks(
      tasks.map((task) =>
        task.categoryId === legacyHealthCategory.id ? { ...task, categoryId: personalCategory.id } : task
      )
    ),
  };
}

function serializeTaskStore(store: TaskStore) {
  return JSON.stringify({
    categories: store.categories,
    tasks: store.tasks,
  });
}

function createRemoteTaskStore(store: TaskStore): RemoteTaskStore {
  return {
    categories: store.categories,
    tasks: store.tasks,
    updatedAt: Date.now(),
  };
}

function getRemoteTaskStoreUpdatedAt(raw: Partial<RemoteTaskStore> | null | undefined) {
  return readCreatedAt(raw?.updatedAt);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTransientTaskSyncError(error: unknown) {
  const code = getFirestoreErrorCode(error).toLowerCase();
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    code.includes('resource-exhausted') ||
    code.includes('quota') ||
    code.includes('deadline-exceeded') ||
    code.includes('unavailable') ||
    message.includes('quota exceeded') ||
    message.includes('resource_exhausted') ||
    message.includes('timed out') ||
    message.includes('taking too long')
  );
}

function isWebTaskStorageAvailable() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getTaskStorageKey(userId: string) {
  return `ownly:tasks:${userId}`;
}

function getLegacyWebTaskStorageKeys(userId: string) {
  return [`ownly:web:tasks:${userId}`];
}

function getTaskCachePathLabel(userId: string) {
  return `${Platform.OS === 'web' ? 'localStorage' : 'asyncStorage'}:${getTaskStorageKey(userId)}`;
}

function getTaskServerPathLabel(userId: string) {
  return `firestore:users/${userId}.tasksState (+ cache ${getTaskCachePathLabel(userId)})`;
}

function storesEqual(left: TaskStore, right: TaskStore) {
  return serializeTaskStore(left) === serializeTaskStore(right);
}

function isMeaningfulTaskStore(userId: string, store: TaskStore) {
  if (store.tasks.length > 0) {
    return true;
  }

  return serializeTaskStore(store) !== serializeTaskStore({ categories: buildSeedCategories(userId), tasks: [] });
}

function getFirebaseProjectId() {
  return process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || '';
}

async function saveTaskStoreToServerViaRestOnly(userId: string, store: TaskStore) {
  const currentUser = auth?.currentUser;
  const projectId = getFirebaseProjectId();

  if (!currentUser || currentUser.uid !== userId || !projectId) {
    throw new Error('Sign in again before syncing tasks.');
  }

  const remoteStore = createRemoteTaskStore(store);
  const idToken = await currentUser.getIdToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(
      userId
    )}?updateMask.fieldPaths=tasksState&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          updatedAt: { integerValue: String(remoteStore.updatedAt) },
          tasksState: {
            mapValue: {
              fields: {
                updatedAt: { integerValue: String(remoteStore.updatedAt) },
                categories: {
                  arrayValue: {
                    values: remoteStore.categories.map((category) => ({
                      mapValue: {
                        fields: {
                          id: { stringValue: category.id },
                          name: { stringValue: category.name },
                          color: { stringValue: category.color },
                        },
                      },
                    })),
                  },
                },
                tasks: {
                  arrayValue: {
                    values: remoteStore.tasks.map((task) => ({
                      mapValue: {
                        fields: {
                          id: { stringValue: task.id },
                          title: { stringValue: task.title },
                          notes: { stringValue: task.notes },
                          categoryId: { stringValue: task.categoryId },
                          scheduledAt: { stringValue: task.scheduledAt },
                          durationMinutes: { integerValue: String(task.durationMinutes) },
                          repeatable: { booleanValue: task.repeatable },
                          done: { booleanValue: task.done },
                          createdAt: { integerValue: String(task.createdAt) },
                        },
                      },
                    })),
                  },
                },
              },
            },
          },
        },
      }),
    }
  );

  if (response.ok) {
    return;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: {
          status?: string;
          message?: string;
        };
      }
    | null;
  const error = new Error(
    payload?.error?.message || payload?.error?.status || `Cloud task sync failed with status ${response.status}.`
  );
  if (payload?.error?.status) {
    Object.assign(error, { code: payload.error.status });
  }
  throw error;
}

function mergeTaskStores(userId: string, remote: TaskStore, local: TaskStore): TaskStore {
  const nextCategories = [...remote.categories];
  const categoryIdMap = new Map<string, string>();

  for (const remoteCategory of remote.categories) {
    categoryIdMap.set(remoteCategory.id, remoteCategory.id);
  }

  for (const localCategory of local.categories) {
    const existingById = nextCategories.find((category) => category.id === localCategory.id);
    if (existingById) {
      categoryIdMap.set(localCategory.id, existingById.id);
      continue;
    }

    const existingByName = nextCategories.find(
      (category) => normalizedCategoryNameKey(category.name) === normalizedCategoryNameKey(localCategory.name)
    );
    if (existingByName) {
      categoryIdMap.set(localCategory.id, existingByName.id);
      continue;
    }

    nextCategories.push(localCategory);
    categoryIdMap.set(localCategory.id, localCategory.id);
  }

  const nextTasks = [...remote.tasks];
  const taskIds = new Set(nextTasks.map((task) => task.id));

  for (const localTask of local.tasks) {
    if (taskIds.has(localTask.id)) {
      continue;
    }

    const mappedCategoryId = categoryIdMap.get(localTask.categoryId) ?? nextCategories[0]?.id ?? '';
    nextTasks.push({
      ...localTask,
      categoryId: mappedCategoryId,
    });
    taskIds.add(localTask.id);
  }

  return normalizeTaskStore(userId, {
    categories: nextCategories,
    tasks: nextTasks,
  });
}

async function readTaskStore(userId: string): Promise<TaskStore | null> {
  try {
    let raw: string | null = null;

    if (Platform.OS === 'web') {
      if (!isWebTaskStorageAvailable()) {
        return null;
      }

      const storageKeys = [getTaskStorageKey(userId), ...getLegacyWebTaskStorageKeys(userId)];
      for (const storageKey of storageKeys) {
        raw = window.localStorage.getItem(storageKey);
        if (raw) {
          break;
        }
      }
    } else {
      raw = await AsyncStorage.getItem(getTaskStorageKey(userId));
    }

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<TaskStore>;
    return normalizeTaskStore(userId, parsed);
  } catch (error) {
    console.error('Failed to read task store cache', error);
    return null;
  }
}

async function writeTaskStore(userId: string, store: TaskStore) {
  try {
    const serialized = serializeTaskStore(store);
    if (Platform.OS === 'web') {
      if (!isWebTaskStorageAvailable()) {
        return;
      }
      const currentStorageKey = getTaskStorageKey(userId);
      window.localStorage.setItem(currentStorageKey, serialized);
      for (const legacyStorageKey of getLegacyWebTaskStorageKeys(userId)) {
        if (legacyStorageKey !== currentStorageKey) {
          window.localStorage.removeItem(legacyStorageKey);
        }
      }
      return;
    }

    await AsyncStorage.setItem(getTaskStorageKey(userId), serialized);
  } catch (error) {
    console.error('Failed to write task store cache', error);
  }
}

async function saveTaskStoreToServer(userId: string, store: TaskStore) {
  const remoteStore = createRemoteTaskStore(store);
  const projectId = getFirebaseProjectId();
  const firestoreDb = db;

  if (!firestoreDb) {
    if (Platform.OS === 'web' && auth && projectId) {
      await saveTaskStoreToServerViaRestOnly(userId, store);

      return;
    }

    throw new Error('Cloud task sync is unavailable right now.');
  }

  const userRef = doc(firestoreDb, 'users', userId);

  const persistRemoteStore = async () => {
    await withFirestoreTimeout(
      setDoc(
        userRef,
        {
          tasksState: remoteStore,
          updatedAt: remoteStore.updatedAt,
        },
        { merge: true }
      ),
      FIRESTORE_TASK_ACTION_TIMEOUT_MS,
      'Timed out while waiting for Cloud Firestore to save tasks.'
    );

    if (Platform.OS !== 'web') {
      await waitForFirestoreWriteSync(firestoreDb, FIRESTORE_TASK_ACK_TIMEOUT_MS);
    }
  };

  const persistRemoteStoreViaRest = async () => {
    const currentUser = auth?.currentUser;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();

    if (!currentUser || currentUser.uid !== userId || !projectId) {
      throw new Error('Sign in again before syncing tasks.');
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(
        userId
      )}?updateMask.fieldPaths=tasksState&updateMask.fieldPaths=updatedAt`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            updatedAt: { integerValue: String(remoteStore.updatedAt) },
            tasksState: {
              mapValue: {
                fields: {
                  updatedAt: { integerValue: String(remoteStore.updatedAt) },
                  categories: {
                    arrayValue: {
                      values: remoteStore.categories.map((category) => ({
                        mapValue: {
                          fields: {
                            id: { stringValue: category.id },
                            name: { stringValue: category.name },
                            color: { stringValue: category.color },
                          },
                        },
                      })),
                    },
                  },
                  tasks: {
                    arrayValue: {
                      values: remoteStore.tasks.map((task) => ({
                        mapValue: {
                          fields: {
                            id: { stringValue: task.id },
                            title: { stringValue: task.title },
                            notes: { stringValue: task.notes },
                            categoryId: { stringValue: task.categoryId },
                            scheduledAt: { stringValue: task.scheduledAt },
                            durationMinutes: { integerValue: String(task.durationMinutes) },
                            repeatable: { booleanValue: task.repeatable },
                            done: { booleanValue: task.done },
                            createdAt: { integerValue: String(task.createdAt) },
                          },
                        },
                      })),
                    },
                  },
                },
              },
            },
          },
        }),
      }
    );

    if (response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            status?: string;
            message?: string;
          };
        }
      | null;
    const error = new Error(
      payload?.error?.message || payload?.error?.status || `Cloud task sync failed with status ${response.status}.`
    );
    if (payload?.error?.status) {
      Object.assign(error, { code: payload.error.status });
    }
    throw error;
  };

  try {
    await persistRemoteStore();
  } catch (firstError) {
    try {
      await recoverFirestoreNetwork(firestoreDb);
      await persistRemoteStore();
      if (__DEV__) {
        console.warn('Task save recovered after retry', firstError);
      }
      return;
    } catch (secondError) {
      if (Platform.OS === 'web') {
        throw secondError;
      }

      await persistRemoteStoreViaRest();
      if (__DEV__) {
        console.warn('Task save recovered through REST fallback', secondError);
      }
    }
  }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [listenerRetryTick, setListenerRetryTick] = useState(0);
  const [syncDebug, setSyncDebug] = useState<SyncDebugState>({
    serverTaskCount: null,
    serverCategoryCount: null,
    lastServerSyncAt: null,
    lastServerSyncError: null,
    collectionPath: null,
  });
  const categoriesRef = useRef<TaskCategory[]>([]);
  const tasksRef = useRef<TaskItem[]>([]);
  const desiredServerSerializedRef = useRef('');
  const lastServerSerializedRef = useRef('');
  const lastLocalMutationAtRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastServerWriteAttemptAtRef = useRef(0);
  const pendingServerSaveCountRef = useRef(0);
  const localBootstrapAttemptedRef = useRef(false);

  useEffect(() => {
    categoriesRef.current = categories;
    tasksRef.current = tasks;
  }, [categories, tasks]);

  const buildCurrentStore = useCallback((): TaskStore => {
    if (!user) {
      return { categories: [], tasks: [] };
    }

    return normalizeTaskStore(user.id, {
      categories: categoriesRef.current,
      tasks: tasksRef.current,
    });
  }, [user]);

  const applyTaskStore = useCallback(
    (nextStore: TaskStore, debugPatch?: Partial<SyncDebugState>) => {
      if (!user) {
        return;
      }

      const normalizedStore = normalizeTaskStore(user.id, nextStore);
      categoriesRef.current = normalizedStore.categories;
      tasksRef.current = normalizedStore.tasks;
      setCategories(normalizedStore.categories);
      setTasks(normalizedStore.tasks);
      void writeTaskStore(user.id, normalizedStore);
      setSyncDebug((previous) => ({
        serverTaskCount: normalizedStore.tasks.length,
        serverCategoryCount: normalizedStore.categories.length,
        lastServerSyncAt: previous.lastServerSyncAt,
        lastServerSyncError: previous.lastServerSyncError,
        collectionPath: getTaskServerPathLabel(user.id),
        ...debugPatch,
      }));
    },
    [user]
  );

  const markServerSyncSuccess = useCallback(
    (taskStore: TaskStore) => {
      if (!user) {
        return;
      }

      lastServerSerializedRef.current = serializeTaskStore(taskStore);
      setSyncDebug((previous) => ({
        ...previous,
        serverTaskCount: taskStore.tasks.length,
        serverCategoryCount: taskStore.categories.length,
        lastServerSyncAt: Date.now(),
        lastServerSyncError: null,
        collectionPath: getTaskServerPathLabel(user.id),
      }));
    },
    [user]
  );

  const markServerSyncError = useCallback(
    (message: string, taskStore?: TaskStore) => {
      if (!user) {
        return;
      }

      setSyncDebug((previous) => ({
        ...previous,
        serverTaskCount: taskStore?.tasks.length ?? previous.serverTaskCount,
        serverCategoryCount: taskStore?.categories.length ?? previous.serverCategoryCount,
        lastServerSyncError: message,
        collectionPath: getTaskServerPathLabel(user.id),
      }));
    },
    [user]
  );

  const enqueueServerSave = useCallback(
    (nextStore: TaskStore) => {
      if (!user) {
        return Promise.reject(new Error('Sign in again before syncing tasks.'));
      }

      if (!db) {
        return Promise.reject(new Error('Cloud task sync is unavailable right now.'));
      }

      const normalizedStore = normalizeTaskStore(user.id, nextStore);
      const serializedStore = serializeTaskStore(normalizedStore);
      desiredServerSerializedRef.current = serializedStore;
      pendingServerSaveCountRef.current += 1;
      const operation = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          for (let attempt = 1; attempt <= TRANSIENT_TASK_SYNC_RETRY_LIMIT; attempt += 1) {
            if (desiredServerSerializedRef.current !== serializedStore) {
              return;
            }

            const elapsedSinceLastAttempt = Date.now() - lastServerWriteAttemptAtRef.current;
            const spacingDelay = Math.max(0, MIN_TASK_SERVER_WRITE_INTERVAL_MS - elapsedSinceLastAttempt);

            if (spacingDelay > 0) {
              await sleep(spacingDelay);
            }

            lastServerWriteAttemptAtRef.current = Date.now();

            try {
              await saveTaskStoreToServer(user.id, normalizedStore);
              return;
            } catch (error) {
              const shouldRetry = attempt < TRANSIENT_TASK_SYNC_RETRY_LIMIT && isTransientTaskSyncError(error);

              if (!shouldRetry) {
                throw error;
              }

              if (__DEV__) {
                console.warn(
                  `Retrying task sync attempt ${attempt + 1}/${TRANSIENT_TASK_SYNC_RETRY_LIMIT}`,
                  error
                );
              }

              await sleep(TRANSIENT_TASK_SYNC_RETRY_DELAY_MS);
            }
          }
        })
        .finally(() => {
          pendingServerSaveCountRef.current = Math.max(0, pendingServerSaveCountRef.current - 1);
        });

      saveQueueRef.current = operation;
      return operation;
    },
    [user]
  );

  const commitOptimisticTaskStore = useCallback(
    (nextStore: TaskStore, rollbackStore: TaskStore, fallbackError: string) => {
      if (!user) {
        return;
      }

      const normalizedNextStore = normalizeTaskStore(user.id, nextStore);
      const normalizedRollbackStore = normalizeTaskStore(user.id, rollbackStore);
      lastLocalMutationAtRef.current = Date.now();
      applyTaskStore(normalizedNextStore, {
        lastServerSyncError: 'Syncing tasks across devices...',
      });

      void enqueueServerSave(normalizedNextStore)
        .then(() => {
          if (Platform.OS !== 'web') {
            markServerSyncSuccess(normalizedNextStore);
          }
        })
        .catch((error) => {
          const errorMessage = toFirestoreWriteErrorMessage(error, fallbackError);
          if (isTransientTaskSyncError(error)) {
            markServerSyncError(errorMessage, normalizedNextStore);
            return;
          }

          applyTaskStore(normalizedRollbackStore);
          markServerSyncError(errorMessage, normalizedRollbackStore);
        });
    },
    [applyTaskStore, enqueueServerSave, markServerSyncError, markServerSyncSuccess, user]
  );

  const commitOptimisticTaskStoreResult = useCallback(
    (nextStore: TaskStore, rollbackStore: TaskStore, fallbackError: string): TaskWriteResult => {
      if (!user) {
        return { ok: false, error: 'Sign in again before syncing tasks.' };
      }

      const normalizedNextStore = normalizeTaskStore(user.id, nextStore);
      const normalizedRollbackStore = normalizeTaskStore(user.id, rollbackStore);

      lastLocalMutationAtRef.current = Date.now();
      applyTaskStore(normalizedNextStore, {
        lastServerSyncError: 'Syncing tasks across devices...',
      });

      void enqueueServerSave(normalizedNextStore)
        .then(() => {
          if (Platform.OS !== 'web') {
            markServerSyncSuccess(normalizedNextStore);
          }
        })
        .catch((error) => {
          const errorMessage = toFirestoreWriteErrorMessage(error, fallbackError);
          if (isTransientTaskSyncError(error)) {
            markServerSyncError(errorMessage, normalizedNextStore);
            return;
          }

          applyTaskStore(normalizedRollbackStore);
          markServerSyncError(errorMessage, normalizedRollbackStore);
        });

      return { ok: true };
    },
    [applyTaskStore, enqueueServerSave, markServerSyncError, markServerSyncSuccess, user]
  );

  useEffect(() => {
    if (!user) {
      categoriesRef.current = [];
      tasksRef.current = [];
      setCategories([]);
      setTasks([]);
      setIsReady(false);
      setSyncDebug({
        serverTaskCount: null,
        serverCategoryCount: null,
        lastServerSyncAt: null,
        lastServerSyncError: null,
        collectionPath: null,
      });
      lastServerSerializedRef.current = '';
      desiredServerSerializedRef.current = '';
      lastLocalMutationAtRef.current = 0;
      lastServerWriteAttemptAtRef.current = 0;
      pendingServerSaveCountRef.current = 0;
      localBootstrapAttemptedRef.current = false;
      saveQueueRef.current = Promise.resolve();
      return;
    }

    let isDisposed = false;
    let unsubscribeSnapshot: (() => void) | null = null;
    void (async () => {
      const localStore = (await readTaskStore(user.id)) ?? {
        categories: buildSeedCategories(user.id),
        tasks: [],
      };
      if (isDisposed) {
        return;
      }

      applyTaskStore(localStore, {
        lastServerSyncError: db ? 'Connecting task sync across devices...' : 'Cloud task sync is unavailable right now.',
        collectionPath: db ? getTaskServerPathLabel(user.id) : getTaskCachePathLabel(user.id),
      });
      setIsReady(true);

      if (!db) {
        return;
      }

      // Force a one-time server read to avoid getting stuck on stale cache-only snapshots.
      try {
        const userRef = doc(db, 'users', user.id);
        const serverSnapshot = await getDoc(userRef);
        if (!isDisposed && serverSnapshot.exists()) {
          const profile = serverSnapshot.data() as { tasksState?: Partial<RemoteTaskStore> } | undefined;
          const remoteRaw = profile?.tasksState;
          if (remoteRaw) {
            const currentLocalStore = buildCurrentStore();
            const remoteStore = normalizeTaskStore(user.id, remoteRaw);
            const mergedStore = mergeTaskStores(user.id, remoteStore, currentLocalStore);
            applyTaskStore(mergedStore);
            markServerSyncSuccess(remoteStore);
          }
        }
      } catch (error) {
        console.error('Failed to fetch latest server task state', error);
      }

      unsubscribeSnapshot = onSnapshot(
        doc(db, 'users', user.id),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (isDisposed) {
            return;
          }

          const currentLocalStore = buildCurrentStore();
          const isFromCache = snapshot.metadata.fromCache;
          const hasPendingWrites = snapshot.metadata.hasPendingWrites;
          const profile = snapshot.data() as { tasksState?: Partial<RemoteTaskStore> } | undefined;
          const remoteRaw = profile?.tasksState;
          const remoteUpdatedAt = getRemoteTaskStoreUpdatedAt(remoteRaw);
          const hasMeaningfulLocalStore = isMeaningfulTaskStore(user.id, currentLocalStore);
          const desiredServerSerialized = desiredServerSerializedRef.current;
          const localMutationIsNewerThanRemote =
            hasMeaningfulLocalStore &&
            lastLocalMutationAtRef.current > 0 &&
            (remoteUpdatedAt === 0 || remoteUpdatedAt < lastLocalMutationAtRef.current);

          if (isFromCache) {
            if (remoteRaw) {
              const cachedStore = normalizeTaskStore(user.id, remoteRaw);
              const cachedSerialized = serializeTaskStore(cachedStore);
              const currentLocalSerialized = serializeTaskStore(currentLocalStore);

              if (
                pendingServerSaveCountRef.current > 0 &&
                currentLocalSerialized !== cachedSerialized
              ) {
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: 'Syncing tasks across devices...',
                });
                return;
              }

              if (
                desiredServerSerialized &&
                currentLocalSerialized === desiredServerSerialized &&
                currentLocalSerialized !== cachedSerialized
              ) {
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: 'Syncing tasks across devices...',
                });
                return;
              }

              if (localMutationIsNewerThanRemote && currentLocalSerialized !== cachedSerialized) {
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: 'Syncing tasks across devices...',
                });
                return;
              }

              if (
                cachedSerialized === lastServerSerializedRef.current &&
                currentLocalSerialized !== cachedSerialized
              ) {
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: hasPendingWrites
                    ? 'Syncing tasks across devices...'
                    : 'Connecting task sync across devices...',
                });
                return;
              }

              applyTaskStore(cachedStore, {
                lastServerSyncError: hasPendingWrites
                  ? 'Syncing tasks across devices...'
                  : 'Connecting task sync across devices...',
              });
            } else {
              applyTaskStore(currentLocalStore, {
                lastServerSyncError:
                  hasPendingWrites || localMutationIsNewerThanRemote
                    ? 'Syncing tasks across devices...'
                    : 'Connecting task sync across devices...',
              });
            }
            return;
          }

          if (!remoteRaw) {
            if (pendingServerSaveCountRef.current > 0 && hasMeaningfulLocalStore) {
              applyTaskStore(currentLocalStore, {
                lastServerSyncError: 'Syncing tasks across devices...',
              });
              return;
            }

            if (
              desiredServerSerialized &&
              serializeTaskStore(currentLocalStore) === desiredServerSerialized &&
              hasMeaningfulLocalStore
            ) {
              applyTaskStore(currentLocalStore, {
                lastServerSyncError: 'Syncing tasks across devices...',
              });
              void enqueueServerSave(currentLocalStore).catch((error) => {
                markServerSyncError(
                  toFirestoreWriteErrorMessage(error, 'Failed to sync tasks across devices.'),
                  currentLocalStore
                );
              });
              return;
            }

            if (hasMeaningfulLocalStore) {
              if (localMutationIsNewerThanRemote) {
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: 'Syncing tasks across devices...',
                });

                void enqueueServerSave(currentLocalStore).catch((error) => {
                  markServerSyncError(
                    toFirestoreWriteErrorMessage(error, 'Failed to sync tasks across devices.'),
                    currentLocalStore
                  );
                });
                return;
              }

              if (!localBootstrapAttemptedRef.current) {
                localBootstrapAttemptedRef.current = true;
                applyTaskStore(currentLocalStore, {
                  lastServerSyncError: 'Syncing tasks across devices...',
                });

                void enqueueServerSave(currentLocalStore)
                  .then(() => {
                    if (Platform.OS !== 'web') {
                      markServerSyncSuccess(currentLocalStore);
                    }
                  })
                  .catch((error) => {
                    markServerSyncError(
                      toFirestoreWriteErrorMessage(error, 'Failed to sync tasks across devices.'),
                      currentLocalStore
                    );
                  });
                return;
              }
            }

            applyTaskStore(currentLocalStore, {
              lastServerSyncError: hasMeaningfulLocalStore ? 'Syncing tasks across devices...' : null,
            });
            if (!hasMeaningfulLocalStore) {
              markServerSyncSuccess(currentLocalStore);
            }
            return;
          }

          localBootstrapAttemptedRef.current = true;
          const remoteStore = normalizeTaskStore(user.id, remoteRaw);
          const mergedStore = mergeTaskStores(user.id, remoteStore, currentLocalStore);
          const remoteSerialized = serializeTaskStore(remoteStore);
          const currentLocalSerialized = serializeTaskStore(currentLocalStore);

          if (
            pendingServerSaveCountRef.current > 0 &&
            currentLocalSerialized !== remoteSerialized
          ) {
            applyTaskStore(currentLocalStore, {
              lastServerSyncError: 'Syncing tasks across devices...',
            });
            return;
          }

          if (
            desiredServerSerialized &&
            currentLocalSerialized === desiredServerSerialized &&
            remoteSerialized !== desiredServerSerialized
          ) {
            applyTaskStore(currentLocalStore, {
              lastServerSyncError: 'Syncing tasks across devices...',
            });
            if (pendingServerSaveCountRef.current === 0) {
              void enqueueServerSave(currentLocalStore).catch((error) => {
                markServerSyncError(
                  toFirestoreWriteErrorMessage(error, 'Failed to sync tasks across devices.'),
                  currentLocalStore
                );
              });
            }
            return;
          }

          if (localMutationIsNewerThanRemote && currentLocalSerialized !== remoteSerialized) {
            applyTaskStore(currentLocalStore, {
              lastServerSyncError: 'Syncing tasks across devices...',
            });
            void enqueueServerSave(currentLocalStore).catch((error) => {
              markServerSyncError(
                toFirestoreWriteErrorMessage(error, 'Failed to sync tasks across devices.'),
                currentLocalStore
              );
            });
            return;
          }

          // If the server is still returning the last acknowledged snapshot, keep any newer
          // optimistic local edits instead of clobbering them back to the stale server state.
          if (
            remoteSerialized === lastServerSerializedRef.current &&
            currentLocalSerialized !== remoteSerialized
          ) {
            applyTaskStore(currentLocalStore, {
              lastServerSyncError: 'Syncing tasks across devices...',
            });
            return;
          }

          if (!storesEqual(mergedStore, remoteStore)) {
            applyTaskStore(mergedStore, {
              lastServerSyncError: 'Merging local tasks into your account sync...',
            });
            void enqueueServerSave(mergedStore)
              .then(() => {
                if (Platform.OS !== 'web') {
                  markServerSyncSuccess(mergedStore);
                }
              })
              .catch((error) => {
                markServerSyncError(
                  toFirestoreWriteErrorMessage(error, 'Failed to finish merging local tasks into cloud sync.'),
                  mergedStore
                );
              });
            return;
          }

          applyTaskStore(remoteStore);
          if (!desiredServerSerialized || remoteSerialized === desiredServerSerialized) {
            desiredServerSerializedRef.current = '';
          }
          if (remoteUpdatedAt >= lastLocalMutationAtRef.current) {
            lastLocalMutationAtRef.current = 0;
          }
          markServerSyncSuccess(remoteStore);
        },
        (error) => {
          console.error('Failed to observe synced task state', error);
          if (!isDisposed) {
            markServerSyncError(
              toFirestoreWriteErrorMessage(error, 'Failed to observe synced task updates.'),
              buildCurrentStore()
            );
            const firestoreDb = db;
            if (firestoreDb) {
              void recoverFirestoreNetwork(firestoreDb).catch(() => undefined);
            }
            setTimeout(() => {
              setListenerRetryTick((previous) => previous + 1);
            }, 1500);
          }
        }
      );

    })();

    return () => {
      isDisposed = true;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [
    applyTaskStore,
    buildCurrentStore,
    enqueueServerSave,
    listenerRetryTick,
    markServerSyncError,
    markServerSyncSuccess,
    user,
  ]);

  const addCategory = (name: string, color: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return categories[0]?.id ?? '';
    }

    const currentStore = buildCurrentStore();
    const existing = currentStore.categories.find(
      (category) => category.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (existing) {
      return existing.id;
    }

    const newCategory: TaskCategory = {
      id: createId('cat'),
      name: normalizedName,
      color,
    };
    const nextStore: TaskStore = {
      categories: [...currentStore.categories, newCategory],
      tasks: currentStore.tasks,
    };
    commitOptimisticTaskStore(nextStore, currentStore, 'Failed to sync the new category.');
    return newCategory.id;
  };

  const renameCategory = (categoryId: string, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || !user) {
      return;
    }

    const currentStore = buildCurrentStore();
    if (!currentStore.categories.some((category) => category.id === categoryId)) {
      return;
    }

    const duplicate = currentStore.categories.find(
      (category) => category.id !== categoryId && category.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicate) {
      return;
    }

    const nextStore: TaskStore = {
      categories: currentStore.categories.map((category) =>
        category.id === categoryId ? { ...category, name: normalizedName } : category
      ),
      tasks: currentStore.tasks,
    };
    commitOptimisticTaskStore(nextStore, currentStore, 'Failed to sync the renamed category.');
  };

  const updateCategoryColor = (categoryId: string, color: string) => {
    if (!user) {
      return;
    }

    const currentStore = buildCurrentStore();
    if (!currentStore.categories.some((category) => category.id === categoryId)) {
      return;
    }

    const nextStore: TaskStore = {
      categories: currentStore.categories.map((category) =>
        category.id === categoryId ? { ...category, color } : category
      ),
      tasks: currentStore.tasks,
    };
    commitOptimisticTaskStore(nextStore, currentStore, 'Failed to sync the category color.');
  };

  const deleteCategory = (categoryId: string) => {
    if (!user) {
      return;
    }

    const currentStore = buildCurrentStore();
    if (currentStore.categories.length <= 1 || !currentStore.categories.some((category) => category.id === categoryId)) {
      return;
    }

    const fallback = currentStore.categories.find((category) => category.id !== categoryId);
    if (!fallback) {
      return;
    }

    const nextStore: TaskStore = {
      categories: currentStore.categories.filter((category) => category.id !== categoryId),
      tasks: currentStore.tasks.map((task) =>
        task.categoryId === categoryId ? { ...task, categoryId: fallback.id } : task
      ),
    };
    commitOptimisticTaskStore(nextStore, currentStore, 'Failed to sync the deleted category.');
  };

  const addTask = async (draft: TaskDraftInput): Promise<TaskWriteResult> => {
    if (!user) {
      return { ok: false, error: 'Sign in again before creating tasks.' };
    }

    const currentStore = buildCurrentStore();
    const newTask: TaskItem = {
      id: createId('task'),
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      durationMinutes: normalizedDurationMinutes(draft.durationMinutes),
      repeatable: draft.repeatable,
      done: false,
      createdAt: Date.now(),
    };

    return commitOptimisticTaskStoreResult(
      {
        categories: currentStore.categories,
        tasks: [newTask, ...currentStore.tasks],
      },
      currentStore,
      'Failed to create the task in your synced account.'
    );
  };

  const updateTask = async (taskId: string, draft: TaskDraftInput): Promise<TaskWriteResult> => {
    if (!user) {
      return { ok: false, error: 'Sign in again before updating tasks.' };
    }

    const currentStore = buildCurrentStore();
    if (!currentStore.tasks.some((task) => task.id === taskId)) {
      return { ok: false, error: 'Task no longer exists.' };
    }

    return commitOptimisticTaskStoreResult(
      {
        categories: currentStore.categories,
        tasks: currentStore.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: draft.title.trim(),
                notes: draft.notes.trim(),
                categoryId: draft.categoryId,
                scheduledAt: normalizedTimestamp(draft.scheduledAt),
                durationMinutes: normalizedDurationMinutes(draft.durationMinutes),
                repeatable: draft.repeatable,
              }
            : task
        ),
      },
      currentStore,
      'Failed to update the task in your synced account.'
    );
  };

  const toggleTaskDone = async (taskId: string): Promise<TaskWriteResult> => {
    if (!user) {
      return { ok: false, error: 'Sign in again before updating tasks.' };
    }

    const currentStore = buildCurrentStore();
    const existing = currentStore.tasks.find((task) => task.id === taskId);
    if (!existing) {
      return { ok: false, error: 'Task no longer exists.' };
    }

    return commitOptimisticTaskStoreResult(
      {
        categories: currentStore.categories,
        tasks: currentStore.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
      },
      currentStore,
      'Failed to sync the completed state for this task.'
    );
  };

  const deleteTask = async (taskId: string): Promise<TaskWriteResult> => {
    if (!user) {
      return { ok: false, error: 'Sign in again before deleting tasks.' };
    }

    const currentStore = buildCurrentStore();
    if (!currentStore.tasks.some((task) => task.id === taskId)) {
      return { ok: false, error: 'Task no longer exists.' };
    }

    return commitOptimisticTaskStoreResult(
      {
        categories: currentStore.categories,
        tasks: currentStore.tasks.filter((task) => task.id !== taskId),
      },
      currentStore,
      'Failed to delete the task from your synced account.'
    );
  };

  const calendarEvents = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return tasks
      .filter((task) => Boolean(task.scheduledAt))
      .slice()
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .map((task) => {
        const category = categoryMap.get(task.categoryId);
        return {
          id: task.id,
          title: task.title,
          notes: task.notes,
          scheduledAt: task.scheduledAt,
          durationMinutes: task.durationMinutes,
          repeatable: task.repeatable,
          done: task.done,
          categoryName: category?.name ?? 'General',
          categoryColor: category?.color ?? '#4C6FFF',
        };
      });
  }, [categories, tasks]);

  const value: TasksContextValue = {
    categories,
    tasks,
    calendarEvents,
    syncDebug,
    isReady,
    addCategory,
    renameCategory,
    updateCategoryColor,
    deleteCategory,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskDone,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error('useTasks must be used inside a TasksProvider');
  }

  return context;
}
