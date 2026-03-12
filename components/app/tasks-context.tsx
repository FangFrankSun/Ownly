import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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

const initialCategories: TaskCategory[] = [
  { id: 'cat-work', name: 'Work', color: '#4C6FFF' },
  { id: 'cat-health', name: 'Health', color: '#17A673' },
  { id: 'cat-life', name: 'Personal', color: '#FF8A4C' },
];

function todayAt(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const initialTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Ship sprint recap',
    notes: 'Share highlights in team channel',
    categoryId: 'cat-work',
    scheduledAt: todayAt(9, 30),
    repeatable: false,
    done: true,
    createdAt: Date.now() - 10000,
  },
  {
    id: 'task-2',
    title: 'Plan tomorrow routine',
    notes: 'Set priorities before lunch',
    categoryId: 'cat-life',
    scheduledAt: todayAt(13, 15),
    repeatable: true,
    done: false,
    createdAt: Date.now() - 9000,
  },
  {
    id: 'task-3',
    title: '20-minute deep stretch',
    notes: 'Lower back + hamstrings',
    categoryId: 'cat-health',
    scheduledAt: todayAt(20, 0),
    repeatable: true,
    done: false,
    createdAt: Date.now() - 8000,
  },
];

const TasksContext = createContext<TasksContextValue | null>(null);

function normalizedTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState(initialCategories);
  const [tasks, setTasks] = useState(initialTasks);

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

    const id = `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nextCategory: TaskCategory = {
      id,
      name: normalizedName,
      color,
    };

    setCategories((prev) => [...prev, nextCategory]);
    return id;
  };

  const deleteCategory = (categoryId: string) => {
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
  };

  const addTask = (draft: TaskDraftInput) => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      scheduledAt: normalizedTimestamp(draft.scheduledAt),
      repeatable: draft.repeatable,
      done: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTask = (taskId: string, draft: TaskDraftInput) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: draft.title.trim(),
              notes: draft.notes.trim(),
              categoryId: draft.categoryId,
              scheduledAt: normalizedTimestamp(draft.scheduledAt),
              repeatable: draft.repeatable,
            }
          : task
      )
    );
  };

  const toggleTaskDone = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
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
