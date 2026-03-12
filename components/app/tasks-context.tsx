import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth-context';
import { supabase } from './supabase-client';

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
  repeatable: boolean;
  done: boolean;
  createdAt: number;
};

type TaskDraftInput = {
  title: string;
  notes: string;
  categoryId: string;
  scheduledAt: string;
  repeatable: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  notes: string;
  scheduledAt: string;
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
  deleteCategory: (categoryId: string) => void;
  addTask: (draft: TaskDraftInput) => void;
  updateTask: (taskId: string, draft: TaskDraftInput) => void;
  toggleTaskDone: (taskId: string) => void;
};

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  category_id: string;
  scheduled_at: string;
  repeatable: boolean;
  done: boolean;
  created_at: number;
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

function toTaskItem(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? '',
    categoryId: row.category_id,
    scheduledAt: row.scheduled_at,
    repeatable: row.repeatable,
    done: row.done,
    createdAt: row.created_at ?? Date.now(),
  };
}

function buildSeedCategories(userId: string): TaskCategory[] {
  const short = userId.slice(0, 8);
  return seedCategoryTemplate.map((category, index) => ({
    id: `cat-${short}-${index}`,
    name: category.name,
    color: category.color,
  }));
}

async function fetchCloudTaskData(userId: string) {
  if (!supabase) {
    return {
      categories: buildSeedCategories(userId),
      tasks: [] as TaskItem[],
    };
  }

  const categoriesResponse = await supabase
    .from('task_categories')
    .select('id,name,color')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (categoriesResponse.error) {
    throw categoriesResponse.error;
  }

  let categories = (categoriesResponse.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));

  if (categories.length === 0) {
    const seed = buildSeedCategories(userId);
    await supabase.from('task_categories').upsert(
      seed.map((category) => ({
        id: category.id,
        user_id: userId,
        name: category.name,
        color: category.color,
        created_at: Date.now(),
      })),
      { onConflict: 'id' }
    );
    categories = seed;
  }

  const tasksResponse = await supabase
    .from('tasks')
    .select('id,title,notes,category_id,scheduled_at,repeatable,done,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tasksResponse.error) {
    throw tasksResponse.error;
  }

  const tasks = (tasksResponse.data as TaskRow[] | null)?.map(toTaskItem) ?? [];
  return {
    categories,
    tasks,
  };
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const refreshFromCloud = async (userId: string) => {
    try {
      const data = await fetchCloudTaskData(userId);
      setCategories(data.categories);
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch task data from Supabase', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setCategories([]);
      setTasks([]);
      return () => {
        isMounted = false;
      };
    }

    const load = async () => {
      const data = await fetchCloudTaskData(user.id);
      if (isMounted) {
        setCategories(data.categories);
        setTasks(data.tasks);
      }
    };

    void load().catch((error) => {
      console.error('Failed to fetch task data from Supabase', error);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const interval = setInterval(() => {
      void refreshFromCloud(user.id);
    }, 7000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !supabase) {
      return;
    }

    const channel = supabase
      .channel(`tasks-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${user.id}` },
        () => {
          void refreshFromCloud(user.id);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => {
        void refreshFromCloud(user.id);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const addCategory = (name: string, color: string) => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return categories[0]?.id ?? '';
    }

    const existing = categories.find(
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

    setCategories((prev) => [...prev, newCategory]);

    if (user && supabase) {
      void supabase
        .from('task_categories')
        .insert({
          id: newCategory.id,
          user_id: user.id,
          name: newCategory.name,
          color: newCategory.color,
          created_at: Date.now(),
        })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save category to Supabase', error);
          }
          void refreshFromCloud(user.id);
        });
    }

    return newCategory.id;
  };

  const deleteCategory = (categoryId: string) => {
    if (!user) {
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
    setTasks((prev) =>
      prev.map((task) =>
        task.categoryId === categoryId ? { ...task, categoryId: fallback.id } : task
      )
    );

    if (!supabase) {
      return;
    }

    void supabase
      .from('tasks')
      .update({ category_id: fallback.id })
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to remap tasks for deleted category', error);
        }
      });

    void supabase
      .from('task_categories')
      .delete()
      .eq('user_id', user.id)
      .eq('id', categoryId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete category from Supabase', error);
        }
        void refreshFromCloud(user.id);
      });
  };

  const addTask = (draft: TaskDraftInput) => {
    if (!user) {
      return;
    }

    const newTask: TaskItem = {
      id: createId('task'),
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      repeatable: draft.repeatable,
      done: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);

    if (!supabase) {
      return;
    }

    void supabase
      .from('tasks')
      .insert({
        id: newTask.id,
        user_id: user.id,
        title: newTask.title,
        notes: newTask.notes,
        category_id: newTask.categoryId,
        scheduled_at: newTask.scheduledAt,
        repeatable: newTask.repeatable,
        done: newTask.done,
        created_at: newTask.createdAt,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save task to Supabase', error);
        }
        void refreshFromCloud(user.id);
      });
  };

  const updateTask = (taskId: string, draft: TaskDraftInput) => {
    if (!user) {
      return;
    }

    const nextTask = {
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      repeatable: draft.repeatable,
    };

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...nextTask } : task))
    );

    if (!supabase) {
      return;
    }

    void supabase
      .from('tasks')
      .update({
        title: nextTask.title,
        notes: nextTask.notes,
        category_id: nextTask.categoryId,
        scheduled_at: nextTask.scheduledAt,
        repeatable: nextTask.repeatable,
      })
      .eq('user_id', user.id)
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update task in Supabase', error);
        }
        void refreshFromCloud(user.id);
      });
  };

  const toggleTaskDone = (taskId: string) => {
    if (!user) {
      return;
    }

    const existing = tasks.find((task) => task.id === taskId);
    if (!existing) {
      return;
    }

    const nextDone = !existing.done;

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, done: nextDone } : task))
    );

    if (!supabase) {
      return;
    }

    void supabase
      .from('tasks')
      .update({ done: nextDone })
      .eq('user_id', user.id)
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to toggle task in Supabase', error);
        }
        void refreshFromCloud(user.id);
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
    deleteCategory,
    addTask,
    updateTask,
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
