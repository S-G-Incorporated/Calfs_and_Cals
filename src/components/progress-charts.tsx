import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { addDays, formatShort, lastDays, useToday, weekStart } from '@/lib/dates';
import type { Mode } from '@/lib/mode';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { trainingDays } from '@/lib/workouts';

import { CalorieLog } from './calorie-log';
import { BarChart, LineChart } from './charts';
import { Card, Muted } from './ui';
import { WeightInputCard } from './weight-input';
import { WorkoutLog } from './workout-log';

/** Weeks shown in the training chart; every week is listed on request below it. */
const CHART_WEEKS = 8;
/** Days shown in the calorie and weight charts; any day can be picked in the calendar below. */
const CHART_DAYS = 30;

/** Charts for one section: workouts per week, or calories per day and weight. */
export function ProgressCharts({ mode }: { mode: Mode }) {
  const today = useToday();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      {mode === 'train' ? (
        <>
          <WorkoutsCard weekCount={CHART_WEEKS} />
          <WorkoutLog from={addDays(weekStart(today), -7 * (CHART_WEEKS - 1))} />
        </>
      ) : (
        <>
          <CaloriesCard dayCount={CHART_DAYS} />
          {/* Keyed by date so the input resets when the day rolls over. */}
          <WeightInputCard key={today} date={today} title="Today's weight" />
          <WeightCard dayCount={CHART_DAYS} />
          <CalorieLog />
        </>
      )}
    </ScrollView>
  );
}

function WorkoutsCard({ weekCount }: { weekCount: number }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();
  const [showAll, setShowAll] = useState(false);

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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showAll }}
        onPress={() => setShowAll((v) => !v)}
        style={({ pressed }) => [styles.allButton, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name={showAll ? 'chevron-up' : 'list'} size={18} color={t.text} />
        <Text style={[styles.allLabel, { color: t.text }]}>{showAll ? 'Hide weeks' : 'See every week'}</Text>
      </Pressable>
      {showAll ? <AllWeeks goal={goal} /> : null}
    </Card>
  );
}

/** Every week from the first logged workout until now, newest first, with its training days. */
function AllWeeks({ goal }: { goal: number | null }) {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const thisMonday = weekStart(today);
  const first = data.workouts.reduce<string | null>((min, w) => (min === null || w.date < min ? w.date : min), null);
  if (first === null) return <Muted>No workouts logged yet.</Muted>;

  const weeks: { monday: string; days: number; sessions: number }[] = [];
  for (let monday = thisMonday; monday >= weekStart(first); monday = addDays(monday, -7)) {
    const sunday = addDays(monday, 6);
    weeks.push({
      monday,
      days: trainingDays(data.workouts, monday, sunday),
      sessions: data.sessions.filter((s) => s.date >= monday && s.date <= sunday).length,
    });
  }

  return (
    <View>
      {weeks.map((w, i) => {
        const reached = goal !== null && w.days >= goal;
        return (
          <View
            key={w.monday}
            style={[styles.weekRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
            <View style={styles.weekText}>
              <Text style={[styles.weekLabel, { color: t.text }]}>
                {w.monday === thisMonday ? 'This week' : `Week of ${formatShort(w.monday)}`}
              </Text>
              <Muted>
                {formatShort(w.monday)} – {formatShort(addDays(w.monday, 6))}
                {w.sessions > 0 ? ` · ${w.sessions} ${w.sessions === 1 ? 'routine' : 'routines'}` : ''}
              </Muted>
            </View>
            <Text style={[styles.weekCount, { color: w.days > 0 ? t.text : t.textSecondary }]}>
              {w.days} {w.days === 1 ? 'time' : 'times'}
            </Text>
            {goal !== null ? (
              <Ionicons
                name={reached ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={reached ? t.good : t.textSecondary}
                accessibilityLabel={reached ? 'Goal reached' : 'Goal not reached'}
              />
            ) : null}
          </View>
        );
      })}
    </View>
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
        <Muted>No calories logged in the last {dayCount} days.</Muted>
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
                ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg in the last ${dayCount} days`
                : 'Log more days to see a trend'
            }
          />
          <LineChart data={weights} color={t.weight} goal={target} />
          {target !== null ? <GoalLegend text={`Target ${target} kg`} /> : null}
        </>
      ) : (
        <Muted>No weight logged in the last {dayCount} days.</Muted>
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
  value: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash: { width: 18, borderTopWidth: 2, borderStyle: 'dashed' },
  allButton: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  allLabel: { fontSize: 15, fontWeight: '600' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  weekText: { flex: 1, gap: 2 },
  weekLabel: { fontSize: 15, fontWeight: '600' },
  weekCount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
