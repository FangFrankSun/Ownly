export function formatTaskDateTime(iso: string, localeTag?: string) {
  const date = new Date(iso);
  return date.toLocaleString(localeTag, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTaskTime(iso: string, localeTag?: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString(localeTag, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTaskDate(iso: string, localeTag?: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function toIsoWithDateAndTime(baseDate: Date, hour: number, minute: number) {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function isValidIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}
