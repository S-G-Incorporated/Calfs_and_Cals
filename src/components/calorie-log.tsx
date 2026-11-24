import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type DateKey, formatRelative, useToday } from '@/lib/dates';
import { sumKcal, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Calendar } from './calendar';
import { Card, Muted } from './ui';

/**
 * A month calendar of the days logged so far. Days with food or weight get a dot (red when over
 * the calorie goal). Picking a day shows what was logged, and the day can be opened to edit it.
 */
export function CalorieLog() {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();
  const [selected, setSelected] = useState<DateKey>(today);

  const goal = data.goals.dailyCalories;
  const kcalByDay = new Map<DateKey, number>();
  for (const f of data.foods) kcalByDay.set(f.date, (kcalByDay.get(f.date) ?? 0) + f.kcal);

  const marks = new Map<DateKey, string>();
  for (const date of Object.keys(data.weights)) marks.set(date, t.weight);
  for (const [date, kcal] of kcalByDay) marks.set(date, goal !== null && kcal > goal ? t.bad : t.calories);

  const foods = data.foods.filter((f) => f.date === selected);
  const kcal = sumKcal(foods);
  const weight = data.weights[selected] ?? null;
  const label = formatRelative(selected, today);

  return (
    <Card title="Pick a day">
      <Calendar value={selected} max={today} marks={marks} color={t.calories} onChange={setSelected} />

      <View style={[styles.legend, { borderColor: t.border }]}>
        <Dot color={t.calories} text="Food logged" />
        {goal !== null ? <Dot color={t.bad} text="Over goal" /> : null}
        <Dot color={t.weight} text="Weight only" />
      </View>

      <View style={[styles.day, { backgroundColor: t.field }]}>
        <View style={styles.dayText}>
          <Text style={[styles.dayLabel, { color: t.text }]}>{label}</Text>
          {foods.length === 0 && weight === null ? (
            <Muted>Nothing logged</Muted>
          ) : (
            <View style={styles.stats}>
              {foods.length > 0 ? (
                <Stat
                  icon="restaurant"
                  color={goal !== null && kcal > goal ? t.bad : t.calories}
                  text={`${kcal.toLocaleString()} kcal · ${foods.length} ${foods.length === 1 ? 'item' : 'items'}`}
                />
              ) : null}
              {weight !== null ? <Stat icon="scale" color={t.weight} text={`${weight} kg`} /> : null}
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${label}`}
          hitSlop={6}
          onPress={() =>
            selected === today
              ? router.push('/calories')
              : router.push({ pathname: '/day/[date]', params: { date: selected, mode: 'calories' } })
          }
          style={({ pressed }) => [styles.open, { backgroundColor: t.calories, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.openLabel, { color: t.onAccent }]}>Open</Text>
          <Ionicons name="chevron-forward" size={16} color={t.onAccent} />
        </Pressable>
      </View>
    </Card>
  );
}

function Dot({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Muted>{text}</Muted>
    </View>
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
  dayText: { flex: 1, gap: 2 },
  dayLabel: { fontSize: 16, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detail: { fontSize: 14, fontVariant: ['tabular-nums'] },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  openLabel: { fontSize: 15, fontWeight: '700' },
});
