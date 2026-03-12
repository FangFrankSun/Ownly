export function formatTaskDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTaskTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTaskDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
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
