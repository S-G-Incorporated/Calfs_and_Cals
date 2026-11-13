import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addDays, useToday, weekStart } from '@/lib/dates';
import type { Mode } from '@/lib/mode';
import { latestWeight, parseNumber, sumKcal, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { trainingDays } from '@/lib/workouts';

import { Card, Field, Muted, ProgressBar } from './ui';

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
      <GoalField
        value={weeklyWorkouts}
        unit="days"
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
  let weightStatus = 'Log your weight on the Today tab to track this goal.';
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
        <GoalField
          value={dailyCalories}
          unit="kcal"
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
        <GoalField value={targetWeight} unit="kg" decimal onChange={(v) => setGoals({ targetWeight: v })} />
        {targetWeight !== null ? (
          <>
            <ProgressBar fraction={weightFraction} color={t.weight} />
            <Muted>{weightStatus}</Muted>
          </>
        ) : null}
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

/** Numeric input that saves on every valid keystroke; empty clears the goal. */
function GoalField({
  value,
  unit,
  decimal,
  onChange,
}: {
  value: number | null;
  unit: string;
  decimal?: boolean;
  onChange: (value: number | null) => void;
}) {
  const t = useTheme();
  const [text, setText] = useState(value === null ? '' : String(value));
  return (
    <View style={styles.fieldRow}>
      <Field
        flex={1}
        value={text}
        placeholder="No goal"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        accessibilityLabel={unit}
        onChangeText={(next) => {
          setText(next);
          onChange(parseNumber(next));
        }}
      />
      <Text style={[styles.unit, { color: t.textSecondary }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unit: { fontSize: 16, minWidth: 70 },
  note: { textAlign: 'center', marginTop: 8 },
  clear: { alignSelf: 'center', padding: 12 },
  clearLabel: { fontSize: 15, fontWeight: '600' },
});
