import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type DateKey, formatRelative, formatTime, useToday } from '@/lib/dates';
import { useStore, type Workout } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { describeDay, formatDuration } from '@/lib/workouts';

import { Card, Muted } from './ui';

type Row =
  | { key: string; type: 'session'; id: string; date: DateKey; name: string; at: number; seconds: number; summary: string | null }
  | { key: string; type: 'loose'; date: DateKey; at: number; summary: string | null };

/**
 * Every workout from `from` onwards, newest first: what was trained, when it finished and how
 * long it took. Sets logged by hand outside a routine are shown as one row per day.
 */
export function WorkoutLog({ from }: { from: DateKey }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const bySession = new Map<string, Workout[]>();
  const looseByDay = new Map<DateKey, Workout[]>();
  const sessionIds = new Set(data.sessions.map((s) => s.id));
  for (const w of data.workouts) {
    if (w.date < from) continue;
    if (w.sessionId && sessionIds.has(w.sessionId)) {
      bySession.set(w.sessionId, [...(bySession.get(w.sessionId) ?? []), w]);
    } else {
      looseByDay.set(w.date, [...(looseByDay.get(w.date) ?? []), w]);
    }
  }

  const rows: Row[] = [
    ...data.sessions
      .filter((s) => s.date >= from)
      .map((s): Row => ({
        key: s.id,
        type: 'session',
        id: s.id,
        date: s.date,
        name: s.routineName,
        at: s.finishedAt,
        seconds: s.seconds,
        summary: describeDay(bySession.get(s.id) ?? []),
      })),
    ...[...looseByDay].map(([date, list]): Row => ({
      key: `day-${date}`,
      type: 'loose',
      date,
      at: Math.max(...list.map((w) => w.at)),
      summary: describeDay(list),
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <Card title="Workouts">
      {rows.length === 0 ? <Muted>No workouts in this period.</Muted> : null}
      {rows.map((row, i) => (
        <View
          key={row.key}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
          <View style={[styles.icon, { backgroundColor: t.field }]}>
            <Ionicons name={row.type === 'session' ? 'barbell' : 'create-outline'} size={18} color={t.workout} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
              {row.type === 'session' ? row.name : 'Logged by hand'}
            </Text>
            <Muted>
              {row.type === 'session'
                ? `${formatRelative(row.date, today)} · ${formatTime(row.at)} · ${formatDuration(row.seconds)}`
                : formatRelative(row.date, today)}
            </Muted>
            {row.summary ? <Muted>{row.summary}</Muted> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${row.type === 'session' ? row.name : 'workout'}`}
            hitSlop={6}
            onPress={() =>
              row.type === 'session'
                ? router.push({ pathname: '/session/[id]', params: { id: row.id } })
                : router.push({ pathname: '/day/[date]', params: { date: row.date, mode: 'train' } })
            }
            style={({ pressed }) => [styles.edit, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="create-outline" size={16} color={t.text} />
            <Text style={[styles.editLabel, { color: t.text }]}>Edit</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  editLabel: { fontSize: 14, fontWeight: '600' },
});
