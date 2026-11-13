import type { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { addDays, type DateKey, weekStart } from '@/lib/dates';
import { parseNumber, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import {
  bestSet,
  CARDIO_ACTIVITIES,
  describeCardio,
  describeDay,
  describeSet,
  EXERCISES,
  isStrength,
  trainingDays,
} from '@/lib/workouts';

import { Dropdown } from './dropdown';
import { Button, Card, Chip, Entry, Field, Muted, ProgressBar } from './ui';

const CARDIO_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Run: 'walk',
  Cycle: 'bicycle',
  Stairs: 'trending-up',
  Walk: 'footsteps',
  Swim: 'water',
};

/** Training for a single day: log strength sets and cardio, and see the day's entries. */
export function WorkoutDayView({ date }: { date: DateKey }) {
  const t = useTheme();
  const { data, addSet, addCardio, removeWorkout, addExercise, removeExercise, setExerciseTarget } =
    useStore();

  const workouts = data.workouts.filter((w) => w.date === date);

  const monday = weekStart(date);
  const sunday = addDays(monday, 6);
  const weekDays = trainingDays(data.workouts, monday, sunday);
  const goal = data.goals.weeklyWorkouts;
  const goalReached = goal !== null && weekDays >= goal;

  // Strength: the last exercise logged is preselected so a session continues with one tap less.
  const lastSet = [...data.workouts].reverse().find(isStrength);
  const [exercise, setExercise] = useState<string | null>(lastSet?.exercise ?? null);
  const [repsText, setRepsText] = useState('');
  const [kgText, setKgText] = useState('');
  const [targetText, setTargetText] = useState(() => {
    const stored = lastSet ? data.exerciseTargets[lastSet.exercise] : undefined;
    return stored === undefined ? '' : String(stored);
  });

  const exercises = [
    ...EXERCISES.map((label) => ({ label })),
    ...[...data.customExercises].sort().map((label) => ({ label, custom: true })),
  ];
  const reps = parseNumber(repsText);
  const kg = parseNumber(kgText);
  const target = exercise === null ? null : (data.exerciseTargets[exercise] ?? null);
  const best = exercise === null ? null : bestSet(data.workouts, exercise);
  const submitSet = () => {
    if (exercise === null || reps === null || kg === null) return;
    addSet(date, exercise, Math.round(reps), kg);
    // Reps and weight stay filled so the next set of the same exercise is one tap away.
  };

  // The target field shows the stored value for whichever exercise is selected.
  const selectExercise = (name: string | null) => {
    setExercise(name);
    const stored = name === null ? undefined : data.exerciseTargets[name];
    setTargetText(stored === undefined ? '' : String(stored));
  };
  const changeTarget = (text: string) => {
    setTargetText(text);
    if (exercise !== null) setExerciseTarget(exercise, parseNumber(text));
  };

  // Cardio.
  const [activity, setActivity] = useState(CARDIO_ACTIVITIES[0]);
  const [kmText, setKmText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const km = parseNumber(kmText);
  const minutes = parseNumber(minutesText);
  const submitCardio = () => {
    if (km === null && minutes === null) return;
    addCardio(date, activity, minutes === null ? null : Math.round(minutes), km);
    setKmText('');
    setMinutesText('');
  };

  const daySummary = describeDay(workouts);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Card>
          <View style={styles.summaryRow}>
            <Text style={[styles.big, { color: t.text }]}>
              {weekDays}
              <Text style={[styles.bigUnit, { color: t.textSecondary }]}>
                {goal !== null ? ` / ${goal}` : ''} training {weekDays === 1 && goal === null ? 'day' : 'days'} this week
              </Text>
            </Text>
            {goal !== null ? (
              <Text style={[styles.remaining, { color: goalReached ? t.good : t.textSecondary }]}>
                {goalReached ? 'Goal reached' : `${goal - weekDays} to go`}
              </Text>
            ) : null}
          </View>
          {goal !== null ? <ProgressBar fraction={weekDays / goal} color={t.workout} /> : null}
          <Muted>{daySummary ? `This day: ${daySummary}` : 'Nothing logged on this day yet.'}</Muted>
        </Card>

        <Card title="Strength">
          <Dropdown
            value={exercise}
            options={exercises}
            placeholder="Choose an exercise"
            color={t.workout}
            accessibilityLabel="Exercise"
            addPlaceholder="Exercise name"
            onSelect={selectExercise}
            onAdd={addExercise}
            onRemove={(name) => {
              removeExercise(name);
              if (exercise === name) selectExercise(null);
            }}
          />
          <View style={styles.row}>
            <Field
              flex={1}
              value={repsText}
              onChangeText={setRepsText}
              placeholder="reps"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={submitSet}
              accessibilityLabel="Repetitions"
            />
            <Field
              flex={1}
              value={kgText}
              onChangeText={setKgText}
              placeholder="kg"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={submitSet}
              accessibilityLabel="Weight in kilograms"
            />
            <Button
              label="Add set"
              color={t.workout}
              disabled={exercise === null || reps === null || kg === null}
              onPress={submitSet}
            />
          </View>
          {exercise !== null ? (
            <>
              <View style={styles.targetRow}>
                <Text style={[styles.targetLabel, { color: t.textSecondary }]}>Target</Text>
                <Field
                  flex={1}
                  value={targetText}
                  onChangeText={changeTarget}
                  placeholder="No target"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  accessibilityLabel={`Target weight for ${exercise}`}
                />
                <Text style={[styles.targetLabel, { color: t.textSecondary }]}>kg</Text>
              </View>
              {best ? (
                <>
                  {target !== null ? (
                    <ProgressBar fraction={best.kg / target} color={best.kg >= target ? t.good : t.workout} />
                  ) : null}
                  <Muted>
                    Best so far: {describeSet(best)}
                    {target !== null
                      ? best.kg >= target
                        ? '  ·  Target reached'
                        : `  ·  ${Math.round((target - best.kg) * 10) / 10} kg to target`
                      : ''}
                  </Muted>
                </>
              ) : (
                <Muted>No sets of {exercise} logged yet.</Muted>
              )}
            </>
          ) : (
            <Muted>Pick an exercise, then log each set with reps and weight.</Muted>
          )}
        </Card>

        <Card title="Cardio">
          <View style={styles.chips}>
            {CARDIO_ACTIVITIES.map((a) => (
              <Chip
                key={a}
                label={a}
                color={t.workout}
                selected={a === activity}
                onPress={() => setActivity(a)}
              />
            ))}
          </View>
          <View style={styles.row}>
            <Field
              flex={1}
              value={kmText}
              onChangeText={setKmText}
              placeholder="km"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={submitCardio}
              accessibilityLabel="Distance in kilometres"
            />
            <Field
              flex={1}
              value={minutesText}
              onChangeText={setMinutesText}
              placeholder="min"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={submitCardio}
              accessibilityLabel="Time in minutes"
            />
            <Button
              label="Add"
              color={t.workout}
              disabled={km === null && minutes === null}
              onPress={submitCardio}
            />
          </View>
          <Muted>Enter distance, time or both.</Muted>
        </Card>

        {workouts.length > 0 ? (
          <Card title="Logged">
            {[...workouts].reverse().map((w) =>
              w.kind === 'strength' ? (
                <Entry
                  key={w.id}
                  icon="barbell"
                  color={t.workout}
                  label={w.exercise}
                  value={describeSet(w)}
                  onRemove={() => removeWorkout(w.id)}
                />
              ) : (
                <Entry
                  key={w.id}
                  icon={CARDIO_ICONS[w.activity] ?? 'fitness'}
                  color={t.workout}
                  label={w.activity}
                  value={describeCardio(w)}
                  onRemove={() => removeWorkout(w.id)}
                />
              ),
            )}
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 16, fontWeight: '500' },
  remaining: { fontSize: 15, fontWeight: '700' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetLabel: { fontSize: 15 },
});
