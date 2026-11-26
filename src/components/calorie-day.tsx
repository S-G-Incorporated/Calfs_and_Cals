import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
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
import { portion } from '@/lib/food-lookup';
import { macroLine, per100 } from '@/lib/foods';
import {
  type Macros,
  parseAmount,
  parseNumber,
  type SavedFood,
  sumKcal,
  sumMacros,
  useStore,
} from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { CategoryPicker } from './category-picker';
import { Button, Card, Entry, Field, Muted, ProgressBar, Toggle } from './ui';
import { WeightInputCard } from './weight-input';

type IconName = keyof typeof Ionicons.glyphMap;

/** How many saved foods are listed on the day screen before the user searches or opens the Foods tab. */
const SAVED_FOODS_SHOWN = 5;

/**
 * Calorie tracking for a single day: a summary, three ways to add food (scan, manual, saved),
 * and the day's entries. Past days also get a weight input; today's weight lives in Progress.
 */
export function CalorieDayView({ date }: { date: DateKey }) {
  const t = useTheme();
  const today = useToday();
  const { data, removeFood } = useStore();

  const foods = data.foods.filter((f) => f.date === date);
  const eaten = sumKcal(foods);
  const macros = sumMacros(foods);
  const calorieGoal = data.goals.dailyCalories;
  const over = calorieGoal !== null && eaten > calorieGoal;

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
        </Card>

        <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>ADD FOOD</Text>
        <ScanCard date={date} />
        <ManualCard date={date} />
        <SavedFoodsCard date={date} />

        {date !== today ? <WeightInputCard date={date} /> : null}

        <Card title="Logged">
          {foods.length > 0 ? (
            [...foods].reverse().map((f) => (
              <Entry
                key={f.id}
                icon="restaurant"
                color={t.calories}
                label={f.name || 'Calories'}
                detail={macroLine(f)}
                value={`${f.kcal.toLocaleString()} kcal`}
                onRemove={() => removeFood(f.id)}
              />
            ))
          ) : (
            <Muted>Nothing logged yet. Pick one of the options above.</Muted>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Icon, title and one-line explanation at the top of each add-food card. */
function OptionHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.optionHeader}>
      <View style={[styles.optionIcon, { backgroundColor: t.field }]}>
        <Ionicons name={icon} size={22} color={t.calories} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: t.text }]}>{title}</Text>
        <Muted>{subtitle}</Muted>
      </View>
      {right}
    </View>
  );
}

/** The whole card is a button that opens the barcode scanner. */
function ScanCard({ date }: { date: DateKey }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scan a barcode"
      onPress={() => router.push({ pathname: '/scan', params: { date } })}
      style={({ pressed }) => [styles.card, { backgroundColor: t.card, opacity: pressed ? 0.6 : 1 }]}>
      <OptionHeader
        icon="barcode-outline"
        title="Scan barcode"
        subtitle="Point the camera at a product's barcode"
        right={<Ionicons name="chevron-forward" size={20} color={t.textSecondary} />}
      />
    </Pressable>
  );
}

/** Type the calories yourself, optionally with macros, and optionally save the food for later. */
function ManualCard({ date }: { date: DateKey }) {
  const t = useTheme();
  const { addFood, saveFood } = useStore();

  const [kcalText, setKcalText] = useState('');
  const [nameText, setNameText] = useState('');
  const [withMacros, setWithMacros] = useState(false);
  const [proteinText, setProteinText] = useState('');
  const [fatText, setFatText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [saveNew, setSaveNew] = useState(false);
  const [gramsText, setGramsText] = useState('');
  const [category, setCategory] = useState<string | null>(null);

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

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <OptionHeader icon="create-outline" title="Enter manually" subtitle="Type in the calories yourself" />
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

      <Toggle label="Protein, fat and carbs" value={withMacros} color={t.calories} onChange={setWithMacros} />
      {withMacros ? (
        <View style={styles.row}>
          <MacroField label="Protein" value={proteinText} onChangeText={setProteinText} onSubmit={submitFood} />
          <MacroField label="Fat" value={fatText} onChangeText={setFatText} onSubmit={submitFood} />
          <MacroField label="Carbs" value={carbsText} onChangeText={setCarbsText} onSubmit={submitFood} />
        </View>
      ) : null}

      <Toggle label="Save this food for later" value={saveNew} color={t.calories} onChange={setSaveNew} />
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
    </View>
  );
}

/** Pick one of the user's own saved foods and log a portion of it for this day. */
function SavedFoodsCard({ date }: { date: DateKey }) {
  const t = useTheme();
  const { data, addFood } = useStore();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [gramsText, setGramsText] = useState('');

  const q = query.trim().toLowerCase();
  // Newest first, so the foods saved or used most recently are at hand.
  const matches = [...data.savedFoods]
    .filter((f) => q === '' || f.name.toLowerCase().includes(q))
    .sort((a, b) => b.at - a.at);
  const shown = matches.slice(0, SAVED_FOODS_SHOWN);
  const grams = parseNumber(gramsText);

  const toggle = (id: string) => {
    setOpenId(id === openId ? null : id);
    setGramsText('');
  };

  const log = (food: SavedFood) => {
    if (grams === null) return;
    const { kcal, ...macros } = portion(food, grams);
    addFood(date, kcal, food.name, macros);
    setOpenId(null);
    setGramsText('');
  };

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <OptionHeader icon="bookmark-outline" title="From saved foods" subtitle="Foods you have saved yourself" />

      {data.savedFoods.length === 0 ? (
        <Muted>
          You have no saved foods yet. Tick “Save this food for later” above, or save a scanned product.
        </Muted>
      ) : (
        <>
          {data.savedFoods.length > SAVED_FOODS_SHOWN ? (
            <View style={[styles.search, { backgroundColor: t.field }]}>
              <Ionicons name="search" size={18} color={t.textSecondary} />
              <Field
                flex={1}
                value={query}
                onChangeText={setQuery}
                placeholder="Search saved foods"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search saved foods"
                style={styles.searchField}
              />
            </View>
          ) : null}

          {shown.length === 0 ? <Muted>No saved foods match.</Muted> : null}
          {shown.map((food, i) => {
            const isOpen = food.id === openId;
            const eaten = isOpen && grams !== null ? portion(food, grams) : null;
            return (
              <View
                key={food.id}
                style={[styles.savedRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => toggle(food.id)}
                  style={({ pressed }) => [styles.savedHead, { opacity: pressed ? 0.6 : 1 }]}>
                  <View style={styles.optionText}>
                    <Text style={[styles.savedName, { color: t.text }]} numberOfLines={1}>
                      {food.name}
                    </Text>
                    <Muted>{Math.round(food.kcal)} kcal per 100 g</Muted>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'add-circle'} size={22} color={t.calories} />
                </Pressable>
                {isOpen ? (
                  <>
                    <View style={styles.row}>
                      <Field
                        flex={1}
                        autoFocus
                        value={gramsText}
                        onChangeText={setGramsText}
                        placeholder="How many grams?"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={() => log(food)}
                        accessibilityLabel={`Grams of ${food.name} eaten`}
                      />
                      <Button label="Add" color={t.calories} disabled={grams === null} onPress={() => log(food)} />
                    </View>
                    {eaten ? (
                      <Muted>
                        {eaten.kcal.toLocaleString()} kcal{macroLine(eaten) ? `  ·  ${macroLine(eaten)}` : ''}
                      </Muted>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/calories/foods', params: { from: 'today' } })}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.linkLabel, { color: t.calories }]}>
              {matches.length > shown.length ? `See all ${data.savedFoods.length} saved foods` : 'Manage saved foods'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={t.calories} />
          </Pressable>
        </>
      )}
    </View>
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
  card: { borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 16, fontWeight: '500' },
  remaining: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: -8, marginLeft: 4 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 17, fontWeight: '700' },
  search: { borderRadius: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchField: { backgroundColor: 'transparent', paddingLeft: 0 },
  savedRow: { gap: 10, paddingTop: 10 },
  savedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedName: { fontSize: 16, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  linkLabel: { fontSize: 15, fontWeight: '700' },
  macro: { flex: 1, gap: 4 },
  macroLabel: { textAlign: 'center' },
});
