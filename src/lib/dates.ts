import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Days are identified by a local-time key: 'YYYY-MM-DD'. */
export type DateKey = string;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toKey(d: Date): DateKey {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Monday of the week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  const d = fromKey(key);
  return addDays(key, -((d.getDay() + 6) % 7));
}

/** The `count` days ending at `end`, oldest first. */
export function lastDays(end: DateKey, count: number): DateKey[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - (count - 1)));
}

export function formatShort(key: DateKey): string {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatLong(key: DateKey): string {
  const d = fromKey(key);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatRelative(key: DateKey, today: DateKey): string {
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  return formatLong(key);
}

/** Today's key, refreshed when the app returns to the foreground after midnight. */
export function useToday(): DateKey {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayKey());
    });
    return () => sub.remove();
  }, []);
  return today;
}
