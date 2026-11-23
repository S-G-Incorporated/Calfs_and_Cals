import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, type DateKey, formatRelative, useToday } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Card, Muted } from './ui';

/** How many extra days each tap on "Show older days" adds. */
const PAGE = 30;

/**
 * Every day from today back to `days` days ago, newest first, with the calories and weight logged
 * that day. Empty days are listed too so a forgotten day can be opened and filled in.
 */
export function CalorieLog({ days }: { days: number }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();
  const [extra, setExtra] = useState(0);

  const kcalByDay = new Map<DateKey, number>();
  for (const f of data.foods) kcalByDay.set(f.date, (kcalByDay.get(f.date) ?? 0) + f.kcal);
  const firstLogged = [...kcalByDay.keys(), ...Object.keys(data.weights)].sort()[0] ?? today;

  const from = addDays(today, -(days + extra - 1));
  const dates: DateKey[] = [];
  for (let date = today; date >= from; date = addDays(date, -1)) dates.push(date);
  const hasOlder = firstLogged < from;
  const goal = data.goals.dailyCalories;

  return (
    <Card title="Days">
      {dates.map((date, i) => {
        const kcal = kcalByDay.get(date) ?? 0;
        const weight = data.weights[date] ?? null;
        const label = formatRelative(date, today);
        return (
          <View
            key={date}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
            <View style={styles.text}>
              <Text style={[styles.date, { color: t.text }]}>{label}</Text>
              {kcal === 0 && weight === null ? (
                <Muted>Nothing logged</Muted>
              ) : (
                <View style={styles.stats}>
                  {kcal > 0 ? (
                    <Stat
                      icon="restaurant"
                      color={goal !== null && kcal > goal ? t.bad : t.calories}
                      text={`${kcal.toLocaleString()} kcal`}
                    />
                  ) : null}
                  {weight !== null ? <Stat icon="scale" color={t.weight} text={`${weight} kg`} /> : null}
                </View>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${label}`}
              hitSlop={6}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date, mode: 'calories' } })}
              style={({ pressed }) => [styles.edit, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="create-outline" size={16} color={t.text} />
              <Text style={[styles.editLabel, { color: t.text }]}>Edit</Text>
            </Pressable>
          </View>
        );
      })}
      {hasOlder ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExtra((e) => e + PAGE)}
          style={({ pressed }) => [styles.more, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-down" size={18} color={t.text} />
          <Text style={[styles.editLabel, { color: t.text }]}>Show older days</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function Stat({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.detail, { color: t.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  text: { flex: 1, gap: 2 },
  date: { fontSize: 16, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detail: { fontSize: 14, fontVariant: ['tabular-nums'] },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  editLabel: { fontSize: 14, fontWeight: '600' },
  more: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
