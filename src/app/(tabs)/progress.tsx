import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart, LineChart } from '@/components/charts';
import { Card, Chip, Muted } from '@/components/ui';
import { addDays, formatShort, lastDays, useToday, weekStart } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

const RANGES = [
  { days: 7, weeks: 4, label: '7 days' },
  { days: 30, weeks: 8, label: '30 days' },
  { days: 90, weeks: 13, label: '90 days' },
];

export default function ProgressScreen() {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();
  const [range, setRange] = useState(RANGES[1]);

  const days = lastDays(today, range.days);

  const kcalByDay = new Map<string, number>();
  for (const f of data.foods) kcalByDay.set(f.date, (kcalByDay.get(f.date) ?? 0) + f.kcal);
  const calories = days.map((d) => ({ label: formatShort(d), value: kcalByDay.get(d) ?? 0 }));
  const loggedDays = calories.filter((c) => c.value > 0);
  const average = loggedDays.length
    ? Math.round(loggedDays.reduce((s, c) => s + c.value, 0) / loggedDays.length)
    : null;
  const calorieGoal = data.goals.dailyCalories;
  const daysWithinGoal =
    calorieGoal !== null ? loggedDays.filter((c) => c.value <= calorieGoal).length : null;

  const weights = days.map((d) => ({ label: formatShort(d), value: data.weights[d] ?? null }));
  const recorded = weights.flatMap((w) => (w.value === null ? [] : [w.value]));
  const weightChange = recorded.length > 1 ? recorded[recorded.length - 1] - recorded[0] : null;
  const targetWeight = data.goals.targetWeight;

  const thisMonday = weekStart(today);
  const weeks = Array.from({ length: range.weeks }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (range.weeks - 1 - i));
    const sunday = addDays(monday, 6);
    return {
      label: formatShort(monday),
      value: data.workouts.filter((w) => w.date >= monday && w.date <= sunday).length,
    };
  });
  const workoutGoal = data.goals.weeklyWorkouts;
  const weeksOnGoal =
    workoutGoal !== null ? weeks.filter((w) => w.value >= workoutGoal).length : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ranges}>
        {RANGES.map((r) => (
          <Chip
            key={r.days}
            label={r.label}
            color={t.textSecondary}
            selected={r === range}
            onPress={() => setRange(r)}
          />
        ))}
      </View>

      <Card title="Calories per day">
        {average !== null ? (
          <>
            <Headline
              value={`${average.toLocaleString()} kcal`}
              caption={
                daysWithinGoal !== null
                  ? `daily average · ${daysWithinGoal} of ${loggedDays.length} logged days within goal`
                  : 'daily average on logged days'
              }
            />
            <BarChart data={calories} color={t.calories} overColor={t.bad} goal={calorieGoal} />
            {calorieGoal !== null ? <GoalLegend text={`Max ${calorieGoal.toLocaleString()} kcal`} /> : null}
          </>
        ) : (
          <Muted>No calories logged in this period.</Muted>
        )}
      </Card>

      <Card title="Weight">
        {recorded.length > 0 ? (
          <>
            <Headline
              value={`${recorded[recorded.length - 1]} kg`}
              caption={
                weightChange !== null
                  ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg in this period`
                  : 'Log more days to see a trend'
              }
            />
            <LineChart data={weights} color={t.weight} goal={targetWeight} />
            {targetWeight !== null ? <GoalLegend text={`Target ${targetWeight} kg`} /> : null}
          </>
        ) : (
          <Muted>No weight logged in this period.</Muted>
        )}
      </Card>

      <Card title="Workouts per week">
        <Headline
          value={String(weeks[weeks.length - 1].value)}
          caption={
            weeksOnGoal !== null
              ? `this week · goal reached in ${weeksOnGoal} of ${weeks.length} weeks`
              : 'this week'
          }
        />
        <BarChart data={weeks} color={t.workout} goal={workoutGoal} integer />
        {workoutGoal !== null ? <GoalLegend text={`Goal ${workoutGoal} per week`} /> : null}
      </Card>
    </ScrollView>
  );
}

function Headline({ value, caption }: { value: string; caption: string }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[styles.value, { color: t.text }]}>{value}</Text>
      <Muted>{caption}</Muted>
    </View>
  );
}

function GoalLegend({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={styles.legend}>
      <View style={[styles.dash, { borderColor: t.good }]} />
      <Muted>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  ranges: { flexDirection: 'row', gap: 8 },
  value: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash: { width: 18, borderTopWidth: 2, borderStyle: 'dashed' },
});
