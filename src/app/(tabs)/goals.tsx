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

import { Card, Field, Muted, ProgressBar } from '@/components/ui';
import { addDays, useToday, weekStart } from '@/lib/dates';
import { latestWeight, parseNumber, sumKcal, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function GoalsScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, resetCount, setGoals, clearAll } = useStore();
  const { dailyCalories, weeklyWorkouts, targetWeight } = data.goals;

  const eaten = sumKcal(data.foods.filter((f) => f.date === today));
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const weekWorkouts = data.workouts.filter((w) => w.date >= monday && w.date <= sunday).length;

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

        <Card title="Workouts per week">
          <GoalField
            value={weeklyWorkouts}
            unit="workouts"
            onChange={(v) => setGoals({ weeklyWorkouts: v === null ? null : Math.round(v) })}
          />
          {weeklyWorkouts !== null ? (
            <>
              <ProgressBar fraction={weekWorkouts / weeklyWorkouts} color={t.workout} />
              <Muted>
                This week: {weekWorkouts} of {weeklyWorkouts}
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

        <Muted style={styles.note}>
          Everything is stored on this phone only. There is no account and no backup.
        </Muted>
        <Pressable accessibilityRole="button" onPress={confirmClear} style={styles.clear}>
          <Text style={[styles.clearLabel, { color: t.bad }]}>Delete all data</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
