import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { addDays, useToday, weekStart } from '@/lib/dates';
import type { Mode } from '@/lib/mode';
import { latestWeight, sumKcal, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { trainingDays } from '@/lib/workouts';

import { Card, Muted, NumberField, ProgressBar } from './ui';

/** Goal settings for one section, plus the delete-all-data control. */
export function GoalsForm({ mode }: { mode: Mode }) {
  const { resetCount, clearAll } = useStore();

  const confirmClear = () =>
    Alert.alert('Delete all data?', 'This removes every entry and goal from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: clearAll },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        key={resetCount}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Muted>Leave a field empty to turn that goal off.</Muted>

        {mode === 'train' ? <WorkoutGoal /> : <CalorieGoals />}

        <Muted style={styles.note}>
          Everything is stored on this phone only. There is no account and no backup.
        </Muted>
        <ClearButton onPress={confirmClear} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function WorkoutGoal() {
  const t = useTheme();
  const today = useToday();
  const { data, setGoals } = useStore();
  const { weeklyWorkouts } = data.goals;

  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const weekDays = trainingDays(data.workouts, monday, sunday);

  return (
    <Card title="Training days per week">
      <NumberField
        value={weeklyWorkouts}
        unit="days"
        placeholder="No goal"
        onChange={(v) => setGoals({ weeklyWorkouts: v === null ? null : Math.round(v) })}
      />
      <Muted>A day counts when at least one set or cardio session is logged.</Muted>
      {weeklyWorkouts !== null ? (
        <>
          <ProgressBar fraction={weekDays / weeklyWorkouts} color={t.workout} />
          <Muted>
            This week: {weekDays} of {weeklyWorkouts}
          </Muted>
        </>
      ) : null}
    </Card>
  );
}

function CalorieGoals() {
  const t = useTheme();
  const today = useToday();
  const { data, setGoals } = useStore();
  const { dailyCalories, targetWeight } = data.goals;

  const eaten = sumKcal(data.foods.filter((f) => f.date === today));

  const current = latestWeight(data.weights, today);
  const firstDate = Object.keys(data.weights).sort()[0];
  const start = firstDate ? data.weights[firstDate] : null;
  let weightFraction = 0;
  let weightStatus = 'Log your weight on the Today tab or in your profile to track this goal.';
  if (targetWeight !== null && current !== null && start !== null) {
    const left = Math.abs(current - targetWeight);
    // Reached when the current weight is at the target or has passed it coming from the start weight.
    const reached = start >= targetWeight ? current <= targetWeight : current >= targetWeight;
    weightFraction = reached ? 1 : start === targetWeight ? 0 : (start - current) / (start - targetWeight);
    weightStatus = reached
      ? `Goal reached — now ${current} kg`
      : `Now ${current} kg · ${left.toFixed(1)} kg to go`;
  }

  return (
    <>
      <Card title="Max calories per day">
        <NumberField
          value={dailyCalories}
          unit="kcal"
          placeholder="No goal"
          onChange={(v) => setGoals({ dailyCalories: v === null ? null : Math.round(v) })}
        />
        {dailyCalories !== null ? (
          <>
            <ProgressBar
              fraction={eaten / dailyCalories}
              color={eaten > dailyCalories ? t.bad : t.calories}
            />
            <Muted>
              Today: {eaten.toLocaleString()} of {dailyCalories.toLocaleString()} kcal
            </Muted>
          </>
        ) : null}
      </Card>

      <Card title="Target weight">
        <NumberField
          value={targetWeight}
          unit="kg"
          decimal
          placeholder="No goal"
          onChange={(v) => setGoals({ targetWeight: v })}
        />
        {targetWeight !== null ? (
          <>
            <ProgressBar fraction={weightFraction} color={t.weight} />
            <Muted>{weightStatus}</Muted>
          </>
        ) : null}
        <Muted>Also shown in your profile, together with your height and BMI.</Muted>
      </Card>
    </>
  );
}

function ClearButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.clear}>
      <Text style={[styles.clearLabel, { color: t.bad }]}>Delete all data</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  note: { textAlign: 'center', marginTop: 8 },
  clear: { alignSelf: 'center', padding: 12 },
  clearLabel: { fontSize: 15, fontWeight: '600' },
});
