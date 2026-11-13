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

import { type DateKey, useToday } from '@/lib/dates';
import { macroLine, per100 } from '@/lib/foods';
import { type Macros, parseAmount, parseNumber, sumKcal, sumMacros, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { CategoryPicker } from './category-picker';
import { Button, Card, Entry, Field, Muted, ProgressBar, Toggle } from './ui';

/** Calorie tracking for a single day: log food and body weight, and see the day's entries. */
export function CalorieDayView({ date }: { date: DateKey }) {
  const t = useTheme();
  const today = useToday();
  const { data, addFood, removeFood, saveFood, setWeight } = useStore();

  const foods = data.foods.filter((f) => f.date === date);
  const savedWeight = data.weights[date] ?? null;

  // Manual entry.
  const [kcalText, setKcalText] = useState('');
  const [nameText, setNameText] = useState('');
  const [withMacros, setWithMacros] = useState(false);
  const [proteinText, setProteinText] = useState('');
  const [fatText, setFatText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [saveNew, setSaveNew] = useState(false);
  const [gramsText, setGramsText] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const [weightText, setWeightText] = useState(savedWeight === null ? '' : String(savedWeight));

  const eaten = sumKcal(foods);
  const macros = sumMacros(foods);
  const calorieGoal = data.goals.dailyCalories;
  const over = calorieGoal !== null && eaten > calorieGoal;

  const kcal = parseNumber(kcalText);
  const grams = parseNumber(gramsText);
  const name = nameText.trim();
  const optional = (value: number | null) => (value === null ? undefined : value);
  const entered: Macros = withMacros
    ? {
        protein: optional(parseAmount(proteinText)),
        fat: optional(parseAmount(fatText)),
        carbs: optional(parseAmount(carbsText)),
      }
    : {};
  // Saving needs a name and the portion size, so the food can be stored per 100 g.
  const canSave = name !== '' && kcal !== null && grams !== null;
  const saved = canSave ? per100({ kcal, ...entered }, grams) : null;

  const submitFood = () => {
    if (kcal === null || (saveNew && !canSave)) return;
    const rounded = Math.round(kcal);
    if (saveNew && saved !== null) {
      addFood(date, rounded, name, { ...entered, grams: grams ?? undefined });
      saveFood({ name, category, barcode: null, ...saved });
    } else {
      addFood(date, rounded, name, entered);
    }
    setKcalText('');
    setNameText('');
    setProteinText('');
    setFatText('');
    setCarbsText('');
    setGramsText('');
    setSaveNew(false);
  };

  const weight = parseNumber(weightText);
  const weightChanged = weight !== savedWeight;
  const submitWeight = () => {
    if (weightText.trim() === '') setWeight(date, null);
    else if (weight !== null) setWeight(date, weight);
  };

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
          {savedWeight !== null ? <Muted>Weight: {savedWeight} kg</Muted> : null}
        </Card>

        <Card
          title="Add calories"
          right={
            <Pressable
              onPress={() => router.push({ pathname: '/scan', params: { date } })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Scan a barcode"
              style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="barcode-outline" size={22} color={t.calories} />
              <Text style={[styles.linkLabel, { color: t.calories }]}>Scan</Text>
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
              placeholder={saveNew ? 'Name' : 'What? (optional)'}
              returnKeyType="done"
              onSubmitEditing={submitFood}
              accessibilityLabel="Food name"
            />
            <Button
              label="Add"
              color={t.calories}
              disabled={kcal === null || (saveNew && !canSave)}
              onPress={submitFood}
            />
          </View>

          <Toggle
            label="Protein, fat and carbs"
            value={withMacros}
            color={t.calories}
            onChange={setWithMacros}
          />
          {withMacros ? (
            <View style={styles.row}>
              <MacroField label="Protein" value={proteinText} onChangeText={setProteinText} onSubmit={submitFood} />
              <MacroField label="Fat" value={fatText} onChangeText={setFatText} onSubmit={submitFood} />
              <MacroField label="Carbs" value={carbsText} onChangeText={setCarbsText} onSubmit={submitFood} />
            </View>
          ) : null}

          <Toggle label="Save this food" value={saveNew} color={t.calories} onChange={setSaveNew} />
          {saveNew ? (
            <>
              <View style={styles.row}>
                <Field
                  flex={1}
                  value={gramsText}
                  onChangeText={setGramsText}
                  placeholder="How many grams is this portion?"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={submitFood}
                  accessibilityLabel="Portion size in grams"
                />
              </View>
              <CategoryPicker value={category} onChange={setCategory} />
              <Muted>
                {saved !== null
                  ? `Saved as ${saved.kcal} kcal per 100 g, so you can log any amount later.`
                  : 'Give the food a name, its calories and the portion size in grams to save it.'}
              </Muted>
            </>
          ) : null}

          {date === today && data.savedFoods.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/calories/foods')}
              style={({ pressed }) => [styles.link, styles.foodsLink, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="bookmark" size={18} color={t.calories} />
              <Text style={[styles.linkLabel, { color: t.calories }]}>Log a saved food</Text>
              <Ionicons name="chevron-forward" size={16} color={t.calories} />
            </Pressable>
          ) : null}
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

        {foods.length > 0 ? (
          <Card title="Logged">
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

/** A grams field with its macro name underneath. */
function MacroField({
  label,
  value,
  onChangeText,
  onSubmit,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.macro}>
      <Field
        value={value}
        onChangeText={onChangeText}
        placeholder="g"
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel={`${label} in grams`}
      />
      <Muted style={styles.macroLabel}>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 16, fontWeight: '500' },
  remaining: { fontSize: 15, fontWeight: '700' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkLabel: { fontSize: 15, fontWeight: '700' },
  foodsLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  macro: { flex: 1, gap: 4 },
  macroLabel: { textAlign: 'center' },
});
