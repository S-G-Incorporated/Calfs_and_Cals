import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useToday } from '@/lib/dates';
import { portion } from '@/lib/food-lookup';
import { macroLine, per100Line } from '@/lib/foods';
import { parseNumber, type SavedFood, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { CategoryPicker } from './category-picker';
import { Button, Chip, Field, Muted } from './ui';

/** Marker for the filter chip that shows foods without a category. */
const UNCATEGORISED = '\u0000none';

/** Searchable, categorised list of saved foods. Tapping one logs a portion for today. */
export function SavedFoodsScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, addFood, updateSavedFood, removeSavedFood } = useStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [gramsText, setGramsText] = useState('');

  const categories = [...new Set(data.savedFoods.flatMap((f) => (f.category ? [f.category] : [])))].sort();
  const hasUncategorised = data.savedFoods.some((f) => f.category === null);

  const q = query.trim().toLowerCase();
  const foods = data.savedFoods
    .filter((f) => q === '' || f.name.toLowerCase().includes(q))
    .filter((f) =>
      filter === null ? true : filter === UNCATEGORISED ? f.category === null : f.category === filter,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const open = (id: string) => {
    setOpenId(id === openId ? null : id);
    setGramsText('');
  };

  const grams = parseNumber(gramsText);
  const logPortion = (food: SavedFood) => {
    if (grams === null) return;
    const { kcal, ...macros } = portion(food, grams);
    addFood(today, kcal, food.name, macros);
    setOpenId(null);
    setGramsText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        data={foods}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.search, { backgroundColor: t.field }]}>
              <Ionicons name="search" size={20} color={t.textSecondary} />
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
            {categories.length > 0 || hasUncategorised ? (
              <View style={styles.chips}>
                <Chip label="All" color={t.calories} selected={filter === null} onPress={() => setFilter(null)} />
                {categories.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    color={t.calories}
                    selected={filter === c}
                    onPress={() => setFilter(filter === c ? null : c)}
                  />
                ))}
                {hasUncategorised && categories.length > 0 ? (
                  <Chip
                    label="No category"
                    color={t.calories}
                    selected={filter === UNCATEGORISED}
                    onPress={() => setFilter(filter === UNCATEGORISED ? null : UNCATEGORISED)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Muted style={styles.empty}>
            {data.savedFoods.length === 0
              ? 'No saved foods yet. Tick “Save this food” when adding calories, or save a scanned product.'
              : 'No saved foods match.'}
          </Muted>
        }
        renderItem={({ item }) => {
          const isOpen = item.id === openId;
          const eaten = grams === null ? null : portion(item, grams);
          return (
            <View style={[styles.row, { backgroundColor: t.card }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => open(item.id)}
                style={({ pressed }) => [styles.rowHead, { opacity: pressed ? 0.6 : 1 }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Muted>
                    {item.category ?? 'No category'} · {Math.round(item.kcal)} kcal per 100 g
                  </Muted>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={t.textSecondary}
                />
              </Pressable>

              {isOpen ? (
                <View style={styles.detail}>
                  <Muted>{per100Line(item)}</Muted>
                  <CategoryPicker
                    value={item.category}
                    onChange={(category) => updateSavedFood(item.id, { category })}
                  />
                  <View style={styles.portionRow}>
                    <Field
                      flex={1}
                      autoFocus
                      value={gramsText}
                      onChangeText={setGramsText}
                      placeholder="How many grams?"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => logPortion(item)}
                      accessibilityLabel={`Grams of ${item.name} eaten`}
                    />
                    <Button
                      label="Log today"
                      color={t.calories}
                      disabled={grams === null}
                      onPress={() => logPortion(item)}
                    />
                  </View>
                  {eaten ? (
                    <Text style={[styles.total, { color: t.text }]}>
                      {eaten.kcal.toLocaleString()} kcal
                      <Muted>{'  ·  ' + macroLine(eaten)}</Muted>
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      removeSavedFood(item.id);
                      setOpenId(null);
                    }}
                    style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={[styles.removeLabel, { color: t.bad }]}>Remove from saved foods</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  gap: { height: 8 },
  header: { gap: 12, marginBottom: 12 },
  search: {
    borderRadius: 12,
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchField: { backgroundColor: 'transparent', paddingLeft: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
  row: { borderRadius: 14, padding: 14, gap: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  detail: { gap: 10 },
  portionRow: { flexDirection: 'row', gap: 8 },
  total: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  remove: { alignSelf: 'flex-start', paddingVertical: 4 },
  removeLabel: { fontSize: 14, fontWeight: '600' },
});
