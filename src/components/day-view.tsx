import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addDays, type DateKey, weekStart } from '@/lib/dates';
import { type Food, type Macros, parseNumber, sumKcal, sumMacros, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Button, Card, Chip, Field, Muted, ProgressBar } from './ui';

const WORKOUT_TYPES = ['Gym', 'Run', 'Walk', 'Cycle', 'Swim', 'Yoga', 'Sport', 'Other'];
const DURATIONS = [15, 30, 45, 60, 90];

/** Named foods the user logs most often, one per name, for one-tap re-adding. */
function frequentFoods(foods: Food[]): { name: string; kcal: number; macros: Macros }[] {
  const seen = new Map<
    string,
    { name: string; kcal: number; macros: Macros; count: number; at: number }
  >();
  for (const f of foods) {
    if (!f.name) continue;
    const key = f.name.toLowerCase();
    const entry = seen.get(key);
    const macros: Macros = { grams: f.grams, protein: f.protein, fat: f.fat, carbs: f.carbs };
    if (entry) {
      entry.count += 1;
      // Keep the most recently used portion for this name.
      if (f.at >= entry.at) Object.assign(entry, { name: f.name, kcal: f.kcal, macros, at: f.at });
    } else {
      seen.set(key, { name: f.name, kcal: f.kcal, macros, count: 1, at: f.at });
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || b.at - a.at).slice(0, 8);
}

/** "150 g · P 12 · F 5 · C 30" for entries that carry macro data. */
function macroLine(m: Macros): string | undefined {
  const parts = [
    m.grams !== undefined ? `${m.grams} g` : null,
    m.protein !== undefined ? `P ${m.protein}` : null,
    m.fat !== undefined ? `F ${m.fat}` : null,
    m.carbs !== undefined ? `C ${m.carbs}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/** Tracking screen for a single day: log calories, workouts and weight, and see the day's entries. */
export function DayView({ date }: { date: DateKey }) {
  const t = useTheme();
  const { data, addFood, removeFood, addWorkout, removeWorkout, setWeight } = useStore();

  const foods = data.foods.filter((f) => f.date === date);
  const workouts = data.workouts.filter((w) => w.date === date);
  const savedWeight = data.weights[date] ?? null;

  const [kcalText, setKcalText] = useState('');
  const [nameText, setNameText] = useState('');
  const [minutes, setMinutes] = useState(
    () => data.workouts[data.workouts.length - 1]?.minutes ?? 30,
  );
  const [weightText, setWeightText] = useState(savedWeight === null ? '' : String(savedWeight));

  const eaten = sumKcal(foods);
  const macros = sumMacros(foods);
  const calorieGoal = data.goals.dailyCalories;
  const over = calorieGoal !== null && eaten > calorieGoal;

  const monday = weekStart(date);
  const sunday = addDays(monday, 6);
  const weekWorkouts = data.workouts.filter((w) => w.date >= monday && w.date <= sunday).length;
  const workoutGoal = data.goals.weeklyWorkouts;

  const kcal = parseNumber(kcalText);
  const submitFood = () => {
    if (kcal === null) return;
    addFood(date, Math.round(kcal), nameText);
    setKcalText('');
    setNameText('');
  };

  const weight = parseNumber(weightText);
  const weightChanged = weight !== savedWeight;
  const submitWeight = () => {
    if (weightText.trim() === '') setWeight(date, null);
    else if (weight !== null) setWeight(date, weight);
  };

  const suggestions = frequentFoods(data.foods);

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
            <Text style={[styles.big, { color: over ? t.bad : t.text }]}>
              {eaten.toLocaleString()}
              <Text style={[styles.bigUnit, { color: t.textSecondary }]}>
                {calorieGoal !== null ? ` / ${calorieGoal.toLocaleString()}` : ''} kcal
              </Text>
            </Text>
            {calorieGoal !== null ? (
              <Text style={[styles.remaining, { color: over ? t.bad : t.good }]}>
                {over
                  ? `${(eaten - calorieGoal).toLocaleString()} over`
                  : `${(calorieGoal - eaten).toLocaleString()} left`}
              </Text>
            ) : null}
          </View>
          {calorieGoal !== null ? (
            <ProgressBar fraction={eaten / calorieGoal} color={over ? t.bad : t.calories} />
          ) : null}
          {macros ? (
            <Muted>
              Protein {macros.protein} g  ·  Fat {macros.fat} g  ·  Carbs {macros.carbs} g
            </Muted>
          ) : null}
          <Muted>
            {workoutGoal !== null
              ? `Workouts this week: ${weekWorkouts} of ${workoutGoal}`
              : `Workouts this week: ${weekWorkouts}`}
            {savedWeight !== null ? `  ·  Weight: ${savedWeight} kg` : ''}
          </Muted>
        </Card>

        <Card
          title="Add calories"
          right={
            <Pressable
              onPress={() => router.push({ pathname: '/scan', params: { date } })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Scan a barcode"
              style={({ pressed }) => [styles.scan, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="barcode-outline" size={22} color={t.calories} />
              <Text style={[styles.scanLabel, { color: t.calories }]}>Scan</Text>
            </Pressable>
          }>
          <View style={styles.row}>
            <Field
              flex={2}
              value={kcalText}
              onChangeText={setKcalText}
              placeholder="kcal"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={submitFood}
              accessibilityLabel="Calories"
            />
            <Field
              flex={3}
              value={nameText}
              onChangeText={setNameText}
              placeholder="What? (optional)"
              returnKeyType="done"
              onSubmitEditing={submitFood}
              accessibilityLabel="Food name"
            />
            <Button label="Add" color={t.calories} disabled={kcal === null} onPress={submitFood} />
          </View>
          {suggestions.length > 0 ? (
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Chip
                  key={s.name}
                  label={s.name}
                  detail={String(s.kcal)}
                  color={t.calories}
                  onPress={() => addFood(date, s.kcal, s.name, s.macros)}
                />
              ))}
            </View>
          ) : (
            <Muted>Foods you name show up here so you can add them again with one tap.</Muted>
          )}
        </Card>

        <Card title="Log workout">
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={`${d} min`}
                color={t.workout}
                selected={d === minutes}
                onPress={() => setMinutes(d)}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {WORKOUT_TYPES.map((type) => (
              <Chip
                key={type}
                label={`+ ${type}`}
                color={t.workout}
                onPress={() => addWorkout(date, type, minutes)}
              />
            ))}
          </View>
          <Muted>Tap a workout to log it with the selected duration.</Muted>
        </Card>

        <Card title="Weight">
          <View style={styles.row}>
            <Field
              flex={1}
              value={weightText}
              onChangeText={setWeightText}
              placeholder="kg"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={submitWeight}
              accessibilityLabel="Weight in kilograms"
            />
            <Button
              label={weightChanged ? 'Save' : 'Saved'}
              color={t.weight}
              disabled={!weightChanged || (weight === null && weightText.trim() !== '')}
              onPress={submitWeight}
            />
          </View>
        </Card>

        {foods.length + workouts.length > 0 ? (
          <Card title="Logged">
            {workouts.map((w) => (
              <Entry
                key={w.id}
                icon="barbell"
                color={t.workout}
                label={w.type}
                value={`${w.minutes} min`}
                onRemove={() => removeWorkout(w.id)}
              />
            ))}
            {[...foods].reverse().map((f) => (
              <Entry
                key={f.id}
                icon="restaurant"
                color={t.calories}
                label={f.name || 'Calories'}
                detail={macroLine(f)}
                value={`${f.kcal.toLocaleString()} kcal`}
                onRemove={() => removeFood(f.id)}
              />
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Entry({
  icon,
  color,
  label,
  detail,
  value,
  onRemove,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  detail?: string;
  value: string;
  onRemove: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.entry}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={styles.entryText}>
        <Text style={[styles.entryLabel, { color: t.text }]} numberOfLines={1}>
          {label}
        </Text>
        {detail ? <Muted>{detail}</Muted> : null}
      </View>
      <Text style={[styles.entryValue, { color: t.textSecondary }]}>{value}</Text>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}>
        <Ionicons name="close-circle" size={22} color={t.textSecondary} />
      </Pressable>
    </View>
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
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  entryText: { flex: 1 },
  entryLabel: { fontSize: 16 },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanLabel: { fontSize: 15, fontWeight: '700' },
  entryValue: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
