import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  atTime,
  type DateKey,
  formatRelative,
  formatTime,
  parseTime,
  toKey,
  useToday,
} from '@/lib/dates';
import { parseNumber } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Field, Muted } from './ui';

/** The date, finish time and duration of a workout, as typed. */
export type WhenDraft = { date: DateKey; time: string; minutes: string };

export function whenFromSession(finishedAt: number, seconds: number): WhenDraft {
  return {
    date: toKey(new Date(finishedAt)),
    time: formatTime(finishedAt),
    minutes: String(Math.max(1, Math.round(seconds / 60))),
  };
}

/** The finish timestamp and duration, or an error message when the input is not usable. */
export function parseWhen(w: WhenDraft): { finishedAt: number; seconds: number } | { error: string } {
  const time = parseTime(w.time);
  if (time === null) return { error: 'Enter the finish time as hh:mm, e.g. 18:30.' };
  const minutes = parseNumber(w.minutes);
  if (minutes === null) return { error: 'Enter how many minutes the workout took.' };
  const finishedAt = atTime(w.date, time);
  if (finishedAt > Date.now() + 60_000) return { error: 'The finish time is in the future.' };
  return { finishedAt, seconds: Math.round(minutes * 60) };
}

/** Fields for when a workout finished and how long it took. */
export function WorkoutWhenFields({
  value,
  onChange,
}: {
  value: WhenDraft;
  onChange: (value: WhenDraft) => void;
}) {
  const t = useTheme();
  const today = useToday();
  const atToday = value.date >= today;

  const step = (by: number) => onChange({ ...value, date: addDays(value.date, by) });

  return (
    <View style={styles.wrap}>
      <View style={styles.labeled}>
        <Muted>Date</Muted>
        <View style={[styles.dateRow, { backgroundColor: t.field }]}>
          <Pressable
            onPress={() => step(-1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.5 : 1 }]}>
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>
          <Text style={[styles.date, { color: t.text }]}>{formatRelative(value.date, today)}</Text>
          <Pressable
            onPress={() => step(1)}
            disabled={atToday}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            style={({ pressed }) => [styles.arrow, { opacity: atToday ? 0.25 : pressed ? 0.5 : 1 }]}>
            <Ionicons name="chevron-forward" size={22} color={t.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.labeled}>
          <Muted>Finished at</Muted>
          <Field
            value={value.time}
            onChangeText={(time) => onChange({ ...value, time })}
            placeholder="hh:mm"
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            accessibilityLabel="Finish time"
          />
        </View>
        <View style={styles.labeled}>
          <Muted>Duration (min)</Muted>
          <Field
            value={value.minutes}
            onChangeText={(minutes) => onChange({ ...value, minutes })}
            placeholder="min"
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel="Duration in minutes"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  labeled: { flex: 1, gap: 4 },
  dateRow: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  arrow: { padding: 4 },
  date: { fontSize: 17, fontWeight: '600' },
});
