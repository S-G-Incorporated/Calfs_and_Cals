import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { addDays, formatShort, lastDays, useToday, weekStart } from '@/lib/dates';
import type { Mode } from '@/lib/mode';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { trainingDays } from '@/lib/workouts';

import { BarChart, LineChart } from './charts';
import { Card, Chip, Muted } from './ui';

type Range = { days: number; weeks: number; label: string };

const DAY_RANGES: Range[] = [
  { days: 7, weeks: 4, label: '7 days' },
  { days: 30, weeks: 8, label: '30 days' },
  { days: 90, weeks: 13, label: '90 days' },
];
const WEEK_RANGES: Range[] = [
  { days: 7, weeks: 4, label: '4 weeks' },
  { days: 30, weeks: 8, label: '8 weeks' },
  { days: 90, weeks: 13, label: '13 weeks' },
];

/** Charts for one section: workouts per week, or calories per day and weight. */
export function ProgressCharts({ mode }: { mode: Mode }) {
  const t = useTheme();
  const ranges = mode === 'train' ? WEEK_RANGES : DAY_RANGES;
  const [range, setRange] = useState(ranges[1]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ranges}>
        {ranges.map((r) => (
          <Chip
            key={r.days}
            label={r.label}
            color={t.textSecondary}
            selected={r === range}
            onPress={() => setRange(r)}
          />
        ))}
      </View>
      {mode === 'train' ? (
        <WorkoutsCard weekCount={range.weeks} />
      ) : (
        <>
          <CaloriesCard dayCount={range.days} />
          <WeightCard dayCount={range.days} />
        </>
      )}
    </ScrollView>
  );
}

function WorkoutsCard({ weekCount }: { weekCount: number }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const thisMonday = weekStart(today);
  const weeks = Array.from({ length: weekCount }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (weekCount - 1 - i));
    const sunday = addDays(monday, 6);
    return { label: formatShort(monday), value: trainingDays(data.workouts, monday, sunday) };
  });
  const goal = data.goals.weeklyWorkouts;
  const weeksOnGoal = goal !== null ? weeks.filter((w) => w.value >= goal).length : null;

  return (
    <Card title="Training days per week">
      <Headline
        value={String(weeks[weeks.length - 1].value)}
        caption={
          weeksOnGoal !== null
            ? `this week · goal reached in ${weeksOnGoal} of ${weeks.length} weeks`
            : 'this week'
        }
      />
      <BarChart data={weeks} color={t.workout} goal={goal} integer />
      {goal !== null ? <GoalLegend text={`Goal ${goal} per week`} /> : null}
    </Card>
  );
}

function CaloriesCard({ dayCount }: { dayCount: number }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const days = lastDays(today, dayCount);
  const kcalByDay = new Map<string, number>();
  for (const f of data.foods) kcalByDay.set(f.date, (kcalByDay.get(f.date) ?? 0) + f.kcal);
  const calories = days.map((d) => ({ label: formatShort(d), value: kcalByDay.get(d) ?? 0 }));
  const loggedDays = calories.filter((c) => c.value > 0);
  const average = loggedDays.length
    ? Math.round(loggedDays.reduce((s, c) => s + c.value, 0) / loggedDays.length)
    : null;
  const goal = data.goals.dailyCalories;
  const daysWithinGoal = goal !== null ? loggedDays.filter((c) => c.value <= goal).length : null;

  return (
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
          <BarChart data={calories} color={t.calories} overColor={t.bad} goal={goal} />
          {goal !== null ? <GoalLegend text={`Max ${goal.toLocaleString()} kcal`} /> : null}
        </>
      ) : (
        <Muted>No calories logged in this period.</Muted>
      )}
    </Card>
  );
}

function WeightCard({ dayCount }: { dayCount: number }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const days = lastDays(today, dayCount);
  const weights = days.map((d) => ({ label: formatShort(d), value: data.weights[d] ?? null }));
  const recorded = weights.flatMap((w) => (w.value === null ? [] : [w.value]));
  const change = recorded.length > 1 ? recorded[recorded.length - 1] - recorded[0] : null;
  const target = data.goals.targetWeight;

  return (
    <Card title="Weight">
      {recorded.length > 0 ? (
        <>
          <Headline
            value={`${recorded[recorded.length - 1]} kg`}
            caption={
              change !== null
                ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg in this period`
                : 'Log more days to see a trend'
            }
          />
          <LineChart data={weights} color={t.weight} goal={target} />
          {target !== null ? <GoalLegend text={`Target ${target} kg`} /> : null}
        </>
      ) : (
        <Muted>No weight logged in this period.</Muted>
      )}
    </Card>
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
