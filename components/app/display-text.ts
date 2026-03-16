import type { SupportedLanguage } from './language-context';

const TASK_CATEGORY_LABELS = {
  work: { en: 'Work', zh: '工作' },
  health: { en: 'Health', zh: '健康' },
  personal: { en: 'Personal', zh: '个人' },
  general: { en: 'General', zh: '通用' },
  uncategorized: { en: 'Uncategorized', zh: '未分类' },
} as const;

export function localizeTaskCategoryName(name: string, language: SupportedLanguage) {
  const normalized = name.trim().toLowerCase();

  for (const entry of Object.values(TASK_CATEGORY_LABELS)) {
    if (normalized === entry.en.toLowerCase() || normalized === entry.zh.toLowerCase()) {
      return entry[language];
    }
  }

  return name;
}
