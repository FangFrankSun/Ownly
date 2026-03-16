import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { useAuth } from './auth-context';
import { db } from './firebase-client';

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

type TasksContextValue = {
  categories: TaskCategory[];
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  addCategory: (name: string, color: string) => string;
  updateCategoryColor: (categoryId: string, color: string) => void;
  deleteCategory: (categoryId: string) => void;
  addTask: (draft: TaskDraftInput) => void;
  updateTask: (taskId: string, draft: TaskDraftInput) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskDone: (taskId: string) => void;
};

const seedCategoryTemplate = [
  { name: 'Work', color: '#4C6FFF' },
  { name: 'Health', color: '#17A673' },
  { name: 'Personal', color: '#FF8A4C' },
] as const;

const TasksContext = createContext<TasksContextValue | null>(null);

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
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now(),
  };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const seededCategoriesRef = useRef(false);

  useEffect(() => {
    const firestore = db;

    if (!user || !firestore) {
      setCategories([]);
      setTasks([]);
      seededCategoriesRef.current = false;
      return;
    }

    const categoriesQuery = query(
      collection(firestore, 'users', user.id, 'task_categories'),
      orderBy('createdAt', 'asc')
    );

    const tasksQuery = query(collection(firestore, 'users', user.id, 'tasks'), orderBy('createdAt', 'desc'));

    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const nextCategories = snapshot.docs.map((categoryDoc) =>
          toCategory(
            {
              id: categoryDoc.id,
              ...(categoryDoc.data() as { name?: string; color?: string }),
            },
            categoryDoc.id
          )
        );

        if (nextCategories.length === 0 && !seededCategoriesRef.current) {
          seededCategoriesRef.current = true;
          const seed = buildSeedCategories(user.id);
          const batch = writeBatch(firestore);
          for (const category of seed) {
            batch.set(doc(firestore, 'users', user.id, 'task_categories', category.id), {
              name: category.name,
              color: category.color,
              createdAt: Date.now(),
            });
          }
          void batch.commit().catch((error) => {
            console.error('Failed to seed Firebase categories', error);
          });
          return;
        }

        setCategories(nextCategories);
      },
      (error) => {
        console.error('Failed to observe Firebase categories', error);
      }
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const nextTasks = snapshot.docs.map((taskDoc) =>
          toTask(
            {
              id: taskDoc.id,
              ...(taskDoc.data() as Partial<TaskItem>),
            },
            taskDoc.id
          )
        );
        setTasks(nextTasks);
      },
      (error) => {
        console.error('Failed to observe Firebase tasks', error);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribeTasks();
    };
  }, [user]);

  const addCategory = (name: string, color: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return categories[0]?.id ?? '';
    }

    const existing = categories.find((category) => category.name.toLowerCase() === normalizedName.toLowerCase());
    if (existing) {
      return existing.id;
    }

    const newCategory: TaskCategory = {
      id: createId('cat'),
      name: normalizedName,
      color,
    };

    setCategories((prev) => [...prev, newCategory]);

    if (user && db) {
      void setDoc(doc(db, 'users', user.id, 'task_categories', newCategory.id), {
        name: newCategory.name,
        color: newCategory.color,
        createdAt: Date.now(),
      }).catch((error) => {
        console.error('Failed to save Firebase category', error);
      });
    }

    return newCategory.id;
  };

  const deleteCategory = (categoryId: string) => {
    if (!user || !db) {
      return;
    }

    if (categories.length <= 1 || !categories.some((category) => category.id === categoryId)) {
      return;
    }

    const fallback = categories.find((category) => category.id !== categoryId);
    if (!fallback) {
      return;
    }

    setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    setTasks((prev) => prev.map((task) => (task.categoryId === categoryId ? { ...task, categoryId: fallback.id } : task)));

    void (async () => {
      try {
        const tasksToReassignQuery = query(
          collection(db, 'users', user.id, 'tasks'),
          where('categoryId', '==', categoryId)
        );
        const tasksToReassign = await getDocs(tasksToReassignQuery);

        const batch = writeBatch(db);
        for (const taskDoc of tasksToReassign.docs) {
          batch.update(taskDoc.ref, { categoryId: fallback.id });
        }
        batch.delete(doc(db, 'users', user.id, 'task_categories', categoryId));
        await batch.commit();
      } catch (error) {
        console.error('Failed to delete Firebase category', error);
      }
    })();
  };

  const updateCategoryColor = (categoryId: string, color: string) => {
    if (!categories.some((category) => category.id === categoryId)) {
      return;
    }

    setCategories((prev) => prev.map((category) => (category.id === categoryId ? { ...category, color } : category)));

    if (!user || !db) {
      return;
    }

    void updateDoc(doc(db, 'users', user.id, 'task_categories', categoryId), { color }).catch((error) => {
      console.error('Failed to update Firebase category color', error);
    });
  };

  const addTask = (draft: TaskDraftInput) => {
    if (!user || !db) {
      return;
    }

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

    setTasks((prev) => [newTask, ...prev]);

    void setDoc(doc(db, 'users', user.id, 'tasks', newTask.id), newTask).catch((error) => {
      console.error('Failed to save Firebase task', error);
    });
  };

  const updateTask = (taskId: string, draft: TaskDraftInput) => {
    if (!user || !db) {
      return;
    }

    const nextTask = {
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      durationMinutes: normalizedDurationMinutes(draft.durationMinutes),
      repeatable: draft.repeatable,
    };

    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...nextTask } : task)));

    void updateDoc(doc(db, 'users', user.id, 'tasks', taskId), nextTask).catch((error) => {
      console.error('Failed to update Firebase task', error);
    });
  };

  const toggleTaskDone = (taskId: string) => {
    if (!user || !db) {
      return;
    }

    const existing = tasks.find((task) => task.id === taskId);
    if (!existing) {
      return;
    }

    const nextDone = !existing.done;
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: nextDone } : task)));

    void updateDoc(doc(db, 'users', user.id, 'tasks', taskId), { done: nextDone }).catch((error) => {
      console.error('Failed to toggle Firebase task', error);
    });
  };

  const deleteTask = (taskId: string) => {
    if (!tasks.some((task) => task.id === taskId)) {
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    if (!user || !db) {
      return;
    }

    void deleteDoc(doc(db, 'users', user.id, 'tasks', taskId)).catch((error) => {
      console.error('Failed to delete Firebase task', error);
    });
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
    addCategory,
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
