import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Field, Muted } from '@/components/ui';
import {
  parseWhen,
  type WhenDraft,
  whenFromSession,
  WorkoutWhenFields,
} from '@/components/workout-when';
import { formatRelative, formatTime, todayKey, toKey } from '@/lib/dates';
import {
  newId,
  parseAmount,
  parseNumber,
  type Routine,
  useStore,
  type WorkoutEntry,
} from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { formatDuration } from '@/lib/workouts';

type SetRow = { id: string; reps: string; kg: string; done: boolean };
type Item =
  | { id: string; kind: 'strength'; name: string; sets: SetRow[] }
  | { id: string; kind: 'cardio'; name: string; km: string; minutes: string; done: boolean };

const toText = (n: number | null) => (n === null ? '' : String(n));

/** Turns the routine's plan into editable rows, prefilled with the planned numbers. */
function fromRoutine(routine: Routine): Item[] {
  return routine.exercises.map((e) =>
    e.kind === 'strength'
      ? {
          id: e.id,
          kind: 'strength',
          name: e.exercise,
          sets: Array.from({ length: Math.max(1, e.sets ?? 1) }, () => ({
            id: newId(),
            reps: toText(e.reps),
            kg: toText(e.kg),
            done: false,
          })),
        }
      : { id: e.id, kind: 'cardio', name: e.activity, km: toText(e.km), minutes: toText(e.minutes), done: false },
  );
}

/** Asks a yes/no question; on web the native Alert is unavailable, so the browser's confirm is used. */
function confirm(title: string, message: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

/** A workout in progress, started from a routine: a running timer and sets to check off. */
export default function WorkoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, finishWorkout } = useStore();
  const routine = data.routines.find((r) => r.id === id);

  const [startedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));

  // Set by hand when the user forgot to press Finish; replaces the live timer.
  const [manual, setManual] = useState<{ finishedAt: number; seconds: number } | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [whenDraft, setWhenDraft] = useState<WhenDraft>(() => whenFromSession(Date.now(), 0));
  const whenResult = parseWhen(whenDraft);
  const openWhen = () => {
    setWhenDraft(manual ? whenFromSession(manual.finishedAt, manual.seconds) : whenFromSession(Date.now(), seconds));
    setWhenOpen(true);
  };
  const applyWhen = () => {
    if ('error' in whenResult) return;
    setManual(whenResult);
    setWhenOpen(false);
  };

  const [items, setItems] = useState<Item[]>(() => (routine ? fromRoutine(routine) : []));
  const doneCount = items.reduce(
    (n, item) => n + (item.kind === 'strength' ? item.sets.filter((s) => s.done).length : item.done ? 1 : 0),
    0,
  );
  const totalCount = items.reduce((n, item) => n + (item.kind === 'strength' ? item.sets.length : 1), 0);

  // Leaving with checked-off sets would lose them, so ask first.
  const [finished, setFinished] = useState(false);
  const disablePrevention = usePreventRemove(doneCount > 0 && !finished, ({ repeat }) =>
    confirm('Discard workout?', 'The sets you checked off will not be saved.', 'Discard', repeat),
  );

  const updateItem = (itemId: string, fn: (item: Item) => Item) =>
    setItems((list) => list.map((item) => (item.id === itemId ? fn(item) : item)));
  const updateSet = (itemId: string, setId: string, patch: Partial<SetRow>) =>
    updateItem(itemId, (item) =>
      item.kind === 'strength'
        ? { ...item, sets: item.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
        : item,
    );
  const addSet = (itemId: string) =>
    updateItem(itemId, (item) => {
      if (item.kind !== 'strength') return item;
      const last = item.sets[item.sets.length - 1];
      return { ...item, sets: [...item.sets, { id: newId(), reps: last?.reps ?? '', kg: last?.kg ?? '', done: false }] };
    });
  const removeSet = (itemId: string, setId: string) =>
    updateItem(itemId, (item) =>
      item.kind === 'strength' ? { ...item, sets: item.sets.filter((s) => s.id !== setId) } : item,
    );

  const finish = () => {
    if (!routine || doneCount === 0) return;
    const entries = items.flatMap((item): WorkoutEntry[] => {
      if (item.kind === 'cardio') {
        if (!item.done) return [];
        const minutes = parseNumber(item.minutes);
        return [
          {
            kind: 'cardio' as const,
            activity: item.name,
            km: parseNumber(item.km),
            minutes: minutes === null ? null : Math.round(minutes),
          },
        ];
      }
      return item.sets
        .filter((s) => s.done)
        .map((s) => ({
          kind: 'strength' as const,
          exercise: item.name,
          reps: Math.round(parseNumber(s.reps) ?? 0),
          kg: parseAmount(s.kg) ?? 0,
        }));
    });
    const when = manual ?? { finishedAt: Date.now(), seconds };
    finishWorkout({ routineId: routine.id, routineName: routine.name, ...when }, entries);
    setFinished(true);
    disablePrevention();
    router.back();
  };

  if (!routine) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Muted>This routine no longer exists.</Muted>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: routine.name,
          headerRight: () => (
            <Pressable
              onPress={openWhen}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Set date and time"
              style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="time-outline" size={20} color={t.workout} />
              <Text style={[styles.headerLabel, { color: t.workout }]}>Set time</Text>
            </Pressable>
          ),
        }}
      />
      <Modal visible={whenOpen} animationType="slide" onRequestClose={() => setWhenOpen(false)}>
        <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>Date and time</Text>
            <Pressable
              onPress={() => setWhenOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={t.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Muted>
              Forgot to press Finish? Set when the workout ended and how long it took. This replaces the
              live timer.
            </Muted>
            <WorkoutWhenFields value={whenDraft} onChange={setWhenDraft} />
            {'error' in whenResult ? (
              <Text style={[styles.error, { color: t.bad }]}>{whenResult.error}</Text>
            ) : null}
            <Button label="Use this time" color={t.workout} disabled={'error' in whenResult} onPress={applyWhen} />
            {manual ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setManual(null);
                  setWhenOpen(false);
                }}
                style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.6 : 1 })}>
                <Text style={[styles.linkLabel, styles.center, { color: t.textSecondary }]}>
                  Go back to the live timer
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Card>
            {manual ? (
              <Pressable accessibilityRole="button" onPress={openWhen} style={styles.timerRow}>
                <Ionicons name="time-outline" size={28} color={t.workout} />
                <View style={styles.flex}>
                  <Text style={[styles.manualTime, { color: t.text }]}>
                    {formatDuration(manual.seconds)}
                  </Text>
                  <Muted>
                    Finished {formatRelative(toKey(new Date(manual.finishedAt)), todayKey()).toLowerCase()} at{' '}
                    {formatTime(manual.finishedAt)} · set by hand
                  </Muted>
                </View>
              </Pressable>
            ) : (
              <View style={styles.timerRow}>
                <Ionicons name="stopwatch-outline" size={28} color={t.workout} />
                <Text
                  style={[styles.timer, { color: t.text }]}
                  accessibilityRole="timer"
                  accessibilityLabel={`Training time ${formatDuration(seconds)}`}>
                  {formatDuration(seconds)}
                </Text>
              </View>
            )}
            <Muted>
              {doneCount} of {totalCount} {totalCount === 1 ? 'set' : 'sets'} done
            </Muted>
          </Card>

          {items.map((item) =>
            item.kind === 'strength' ? (
              <Card key={item.id} title={item.name}>
                <View style={styles.setHeader}>
                  <Text style={[styles.setIndex, { color: t.textSecondary }]}>Set</Text>
                  <Muted style={styles.flex}>Reps</Muted>
                  <Muted style={styles.flex}>kg</Muted>
                  <View style={styles.checkSpace} />
                </View>
                {item.sets.map((s, index) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={[styles.setIndex, { color: t.text }]}>{index + 1}</Text>
                    <Field
                      flex={1}
                      value={s.reps}
                      onChangeText={(reps) => updateSet(item.id, s.id, { reps })}
                      placeholder="reps"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      editable={!s.done}
                      style={s.done ? styles.doneField : undefined}
                      accessibilityLabel={`Reps for set ${index + 1} of ${item.name}`}
                    />
                    <Field
                      flex={1}
                      value={s.kg}
                      onChangeText={(kg) => updateSet(item.id, s.id, { kg })}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      editable={!s.done}
                      style={s.done ? styles.doneField : undefined}
                      accessibilityLabel={`Weight for set ${index + 1} of ${item.name} in kilograms`}
                    />
                    <CheckBox
                      checked={s.done}
                      disabled={parseNumber(s.reps) === null}
                      label={`Set ${index + 1} of ${item.name} done`}
                      onPress={() => updateSet(item.id, s.id, { done: !s.done })}
                    />
                  </View>
                ))}
                <View style={styles.setActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addSet(item.id)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name="add" size={18} color={t.workout} />
                    <Text style={[styles.linkLabel, { color: t.workout }]}>Add set</Text>
                  </Pressable>
                  {item.sets.length > 0 && !item.sets[item.sets.length - 1].done ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => removeSet(item.id, item.sets[item.sets.length - 1].id)}
                      hitSlop={6}
                      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
                      <Ionicons name="remove" size={18} color={t.textSecondary} />
                      <Text style={[styles.linkLabel, { color: t.textSecondary }]}>Remove set</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ) : (
              <Card key={item.id} title={item.name}>
                <View style={styles.setRow}>
                  <Field
                    flex={1}
                    value={item.km}
                    onChangeText={(km) => updateItem(item.id, (i) => ({ ...i, km }) as Item)}
                    placeholder="km"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    editable={!item.done}
                    style={item.done ? styles.doneField : undefined}
                    accessibilityLabel={`Distance for ${item.name} in kilometres`}
                  />
                  <Field
                    flex={1}
                    value={item.minutes}
                    onChangeText={(minutes) => updateItem(item.id, (i) => ({ ...i, minutes }) as Item)}
                    placeholder="min"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    editable={!item.done}
                    style={item.done ? styles.doneField : undefined}
                    accessibilityLabel={`Time for ${item.name} in minutes`}
                  />
                  <CheckBox
                    checked={item.done}
                    disabled={parseNumber(item.km) === null && parseNumber(item.minutes) === null}
                    label={`${item.name} done`}
                    onPress={() => updateItem(item.id, (i) => ({ ...i, done: !item.done }) as Item)}
                  />
                </View>
                <Muted>Enter distance, time or both, then check it off.</Muted>
              </Card>
            ),
          )}
        </ScrollView>
        <View
          style={[
            styles.footer,
            { backgroundColor: t.background, borderColor: t.border, paddingBottom: 12 + insets.bottom },
          ]}>
          <Button label="Finish workout" color={t.good} disabled={doneCount === 0} onPress={finish} />
          {doneCount === 0 ? <Muted style={styles.center}>Check off at least one set to finish.</Muted> : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function CheckBox({
  checked,
  disabled,
  label,
  onPress,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const off = disabled && !checked;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: off }}
      disabled={off}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.check,
        {
          backgroundColor: checked ? t.good : t.field,
          opacity: off ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}>
      <Ionicons name="checkmark" size={26} color={checked ? t.onAccent : t.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timer: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -6 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { width: 28, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  checkSpace: { width: 48 },
  check: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doneField: { opacity: 0.6 },
  setActions: { flexDirection: 'row', gap: 20 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkLabel: { fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
  center: { textAlign: 'center' },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  headerLabel: { fontSize: 16, fontWeight: '600' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  manualTime: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  error: { fontSize: 13 },
});
