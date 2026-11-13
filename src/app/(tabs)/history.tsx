import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, type DateKey, formatRelative, useToday } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type Day = { date: DateKey; kcal: number; workouts: number; minutes: number; weight: number | null };

export default function HistoryScreen() {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const byDate = new Map<DateKey, Day>();
  const day = (date: DateKey) => {
    let d = byDate.get(date);
    if (!d) {
      d = { date, kcal: 0, workouts: 0, minutes: 0, weight: data.weights[date] ?? null };
      byDate.set(date, d);
    }
    return d;
  };
  for (const f of data.foods) day(f.date).kcal += f.kcal;
  for (const w of data.workouts) {
    const d = day(w.date);
    d.workouts += 1;
    d.minutes += w.minutes;
  }
  for (const date of Object.keys(data.weights)) day(date);

  // Every day from today back to the first logged day (at least two weeks),
  // so missed days can be opened and filled in.
  const earliest = [...byDate.keys(), addDays(today, -13)].sort()[0];
  const days: Day[] = [];
  for (let date = today; date >= earliest; date = addDays(date, -1)) days.push(day(date));

  const goal = data.goals.dailyCalories;

  return (
    <FlatList
      data={days}
      keyExtractor={(d) => d.date}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      renderItem={({ item }) => {
        const empty = item.kcal === 0 && item.workouts === 0 && item.weight === null;
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/day/[date]', params: { date: item.date } })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: t.card, opacity: pressed ? 0.6 : 1 },
            ]}>
            <View style={styles.main}>
              <Text style={[styles.date, { color: t.text }]}>{formatRelative(item.date, today)}</Text>
              {empty ? (
                <Text style={[styles.detail, { color: t.textSecondary }]}>Nothing logged</Text>
              ) : (
                <View style={styles.stats}>
                  {item.kcal > 0 ? (
                    <Stat
                      icon="restaurant"
                      color={goal !== null && item.kcal > goal ? t.bad : t.calories}
                      text={`${item.kcal.toLocaleString()} kcal`}
                    />
                  ) : null}
                  {item.workouts > 0 ? (
                    <Stat icon="barbell" color={t.workout} text={`${item.minutes} min`} />
                  ) : null}
                  {item.weight !== null ? (
                    <Stat icon="scale" color={t.weight} text={`${item.weight} kg`} />
                  ) : null}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
          </Pressable>
        );
      }}
    />
  );
}

function Stat({
  icon,
  color,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.detail, { color: t.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  gap: { height: 8 },
  row: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  main: { flex: 1, gap: 4 },
  date: { fontSize: 16, fontWeight: '600' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detail: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
