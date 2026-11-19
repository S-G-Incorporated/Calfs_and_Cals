import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { type ReactNode, useState } from 'react';
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

import { Dropdown } from '@/components/dropdown';
import { Button, Card, Field, Muted } from '@/components/ui';
import { newId, parseNumber, type RoutineExercise, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { CARDIO_ACTIVITIES, EXERCISES } from '@/lib/workouts';

/** A routine item while editing; the numbers stay text until the routine is saved. */
type Draft =
  | { id: string; kind: 'strength'; name: string; sets: string; reps: string; kg: string }
  | { id: string; kind: 'cardio'; name: string; km: string; minutes: string };

const toText = (n: number | null) => (n === null ? '' : String(n));
const toInt = (text: string) => {
  const n = parseNumber(text);
  return n === null ? null : Math.round(n);
};

function toDraft(e: RoutineExercise): Draft {
  return e.kind === 'strength'
    ? { id: e.id, kind: 'strength', name: e.exercise, sets: toText(e.sets), reps: toText(e.reps), kg: toText(e.kg) }
    : { id: e.id, kind: 'cardio', name: e.activity, km: toText(e.km), minutes: toText(e.minutes) };
}

function fromDraft(d: Draft): RoutineExercise {
  return d.kind === 'strength'
    ? { id: d.id, kind: 'strength', exercise: d.name, sets: toInt(d.sets), reps: toInt(d.reps), kg: parseNumber(d.kg) }
    : { id: d.id, kind: 'cardio', activity: d.name, km: parseNumber(d.km), minutes: toInt(d.minutes) };
}

/** Create a routine (`/routine/new`) or edit an existing one (`/routine/<id>`). */
export default function RoutineEditorScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveRoutine, removeRoutine, addExercise, removeExercise } = useStore();
  const existing = data.routines.find((r) => r.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [rows, setRows] = useState<Draft[]>(() => existing?.exercises.map(toDraft) ?? []);

  const exerciseOptions = [
    ...EXERCISES.map((label) => ({ label })),
    ...[...data.customExercises].sort().map((label) => ({ label, custom: true })),
  ];

  const addStrength = (exercise: string) =>
    setRows((r) => [...r, { id: newId(), kind: 'strength', name: exercise, sets: '3', reps: '', kg: '' }]);
  const addCardio = (activity: string) =>
    setRows((r) => [...r, { id: newId(), kind: 'cardio', name: activity, km: '', minutes: '' }]);
  const updateRow = (rowId: string, patch: Record<string, string>) =>
    setRows((r) => r.map((row) => (row.id === rowId ? ({ ...row, ...patch } as Draft) : row)));
  const removeRow = (rowId: string) => setRows((r) => r.filter((row) => row.id !== rowId));
  const moveRow = (index: number, by: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });

  const canSave = name.trim() !== '' && rows.length > 0;
  const done = () => {
    if (!canSave) return;
    saveRoutine({ id: existing?.id, name, exercises: rows.map(fromDraft) });
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    const remove = () => {
      removeRoutine(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      remove();
      return;
    }
    Alert.alert('Delete routine?', `"${existing.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const numberField = (row: Draft, key: string, label: string, value: string, decimal: boolean) => (
    <Labeled label={label}>
      <Field
        value={value}
        onChangeText={(text) => updateRow(row.id, { [key]: text })}
        placeholder="–"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        accessibilityLabel={`${label} for ${row.name}`}
      />
    </Labeled>
  );

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit routine' : 'New routine' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Card title="Name">
            <Field
              value={name}
              onChangeText={setName}
              placeholder="e.g. Push day"
              returnKeyType="done"
              autoFocus={!existing}
              accessibilityLabel="Routine name"
            />
          </Card>

          <Card title="Exercises">
            {rows.length === 0 ? (
              <Muted>Add the strength exercises and cardio this routine is made of.</Muted>
            ) : null}
            {rows.map((row, index) => (
              <View key={row.id} style={[styles.exercise, { borderColor: t.border }]}>
                <View style={styles.exerciseHeader}>
                  <Ionicons
                    name={row.kind === 'strength' ? 'barbell' : 'heart'}
                    size={18}
                    color={t.workout}
                  />
                  <Text style={[styles.exerciseName, { color: t.text }]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <IconButton
                    icon="chevron-up"
                    label={`Move ${row.name} up`}
                    disabled={index === 0}
                    onPress={() => moveRow(index, -1)}
                  />
                  <IconButton
                    icon="chevron-down"
                    label={`Move ${row.name} down`}
                    disabled={index === rows.length - 1}
                    onPress={() => moveRow(index, 1)}
                  />
                  <IconButton icon="close-circle" label={`Remove ${row.name}`} onPress={() => removeRow(row.id)} />
                </View>
                <View style={styles.numbers}>
                  {row.kind === 'strength' ? (
                    <>
                      {numberField(row, 'sets', 'Sets', row.sets, false)}
                      {numberField(row, 'reps', 'Reps', row.reps, false)}
                      {numberField(row, 'kg', 'kg', row.kg, true)}
                    </>
                  ) : (
                    <>
                      {numberField(row, 'km', 'km', row.km, true)}
                      {numberField(row, 'minutes', 'min', row.minutes, false)}
                    </>
                  )}
                </View>
              </View>
            ))}
            <Dropdown
              value={null}
              options={exerciseOptions}
              placeholder="+ Add exercise"
              color={t.workout}
              accessibilityLabel="Exercise"
              addPlaceholder="Exercise name"
              onSelect={addStrength}
              onAdd={addExercise}
              onRemove={removeExercise}
            />
            <Dropdown
              value={null}
              options={CARDIO_ACTIVITIES.map((label) => ({ label }))}
              placeholder="+ Add cardio"
              color={t.workout}
              accessibilityLabel="Cardio"
              onSelect={addCardio}
            />
          </Card>

          <Button label="Done" color={t.workout} disabled={!canSave} onPress={done} />
          {!canSave ? (
            <Muted style={styles.center}>Give the routine a name and at least one exercise.</Muted>
          ) : null}
          {existing ? (
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.deleteLabel, { color: t.bad }]}>Delete routine</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.labeled}>
      <Muted>{label}</Muted>
      {children}
    </View>
  );
}

function IconButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: disabled ? 0.25 : pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={22} color={t.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  exercise: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseName: { flex: 1, fontSize: 16, fontWeight: '700' },
  numbers: { flexDirection: 'row', gap: 8 },
  labeled: { flex: 1, gap: 4 },
  center: { textAlign: 'center' },
  delete: { alignSelf: 'center', padding: 8 },
  deleteLabel: { fontSize: 16, fontWeight: '600' },
});
