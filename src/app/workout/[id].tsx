import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import {
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

import { Dropdown } from '@/components/dropdown';
import { Button, Card, Chip, Field, Muted, Toggle } from '@/components/ui';
import {
  countDone,
  countTotal,
  elapsedSeconds,
  type Item,
  restLeft,
  type SetRow,
  useActiveWorkout,
  useNow,
} from '@/lib/active-workout';
import { confirm } from '@/lib/confirm';
import {
  newId,
  parseAmount,
  parseNumber,
  type RoutineExercise,
  useStore,
  type WorkoutEntry,
} from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { CARDIO_ACTIVITIES, EXERCISES, formatDuration } from '@/lib/workouts';

const REST_OPTIONS = [0, 60, 90, 120, 180];

const toInt = (text: string) => {
  const n = parseNumber(text);
  return n === null ? null : Math.round(n);
};

/** The workout's exercises as a routine plan, keeping the planned numbers of unchanged ones. */
function toRoutineExercises(items: Item[], planned: RoutineExercise[]): RoutineExercise[] {
  return items.map((item) => {
    const existing = planned.find((e) => e.id === item.id);
    if (existing) return existing;
    if (item.kind === 'cardio') {
      return { id: item.id, kind: 'cardio', activity: item.name, km: parseNumber(item.km), minutes: toInt(item.minutes) };
    }
    const first = item.sets[0];
    return {
      id: item.id,
      kind: 'strength',
      exercise: item.name,
      sets: item.sets.length || null,
      reps: first ? toInt(first.reps) : null,
      kg: first ? parseNumber(first.kg) : null,
    };
  });
}

/**
 * A workout in progress, started from a routine. The workout itself lives in the active-workout
 * store, so leaving this screen only minimizes it to the bar at the bottom of the app.
 */
export default function WorkoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, finishWorkout, saveRoutine, addExercise, removeExercise } = useStore();
  const active = useActiveWorkout();
  const { workout } = active;
  const routine = data.routines.find((r) => r.id === id);

  // Opening the screen for a routine with nothing in progress starts it.
  useEffect(() => {
    if (!active.workout && routine) active.start(routine);
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useNow(workout !== null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [saveToRoutine, setSaveToRoutine] = useState(true);

  if (!workout || workout.routineId !== id) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Workout' }} />
        {workout ? (
          <>
            <Muted style={styles.center}>&quot;{workout.routineName}&quot; is already in progress.</Muted>
            <Button
              label={`Open ${workout.routineName}`}
              color={t.workout}
              onPress={() => router.replace({ pathname: '/workout/[id]', params: { id: workout.routineId } })}
            />
          </>
        ) : (
          <Muted>{routine ? 'Starting…' : 'This routine no longer exists.'}</Muted>
        )}
      </View>
    );
  }

  const { items } = workout;
  const seconds = elapsedSeconds(workout, now);
  const rest = restLeft(workout, now);
  const paused = workout.runningSince === null;
  const doneCount = countDone(items);
  const totalCount = countTotal(items);
  const planned = routine?.exercises ?? [];
  const changed = routine !== undefined && planned.map((e) => e.id).join() !== items.map((i) => i.id).join();

  const updateItem = (itemId: string, fn: (item: Item) => Item) =>
    active.updateItems((list) => list.map((item) => (item.id === itemId ? fn(item) : item)));
  const updateSet = (itemId: string, setId: string, patch: Partial<SetRow>) =>
    updateItem(itemId, (item) =>
      item.kind === 'strength'
        ? { ...item, sets: item.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
        : item,
    );
  const toggleSet = (itemId: string, set: SetRow) => {
    updateSet(itemId, set.id, { done: !set.done });
    if (set.done) active.skipRest();
    else active.startRest();
  };
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
  const addStrength = (name: string) =>
    active.updateItems((list) => [
      ...list,
      { id: newId(), kind: 'strength', name, sets: [1, 2, 3].map(() => ({ id: newId(), reps: '', kg: '', done: false })) },
    ]);
  const addCardio = (name: string) =>
    active.updateItems((list) => [...list, { id: newId(), kind: 'cardio', name, km: '', minutes: '', done: false }]);
  const removeItem = (item: Item) => {
    const remove = () => active.updateItems((list) => list.filter((i) => i.id !== item.id));
    const hasDone = item.kind === 'strength' ? item.sets.some((s) => s.done) : item.done;
    if (hasDone) confirm(`Remove ${item.name}?`, 'The sets you checked off will not be saved.', 'Remove', remove);
    else remove();
  };

  const exerciseOptions = [
    ...EXERCISES.map((label) => ({ label })),
    ...[...data.customExercises].sort().map((label) => ({ label, custom: true })),
  ];

  const finish = () => {
    if (doneCount === 0) return;
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
    finishWorkout(
      { routineId: workout.routineId, routineName: workout.routineName, finishedAt: Date.now(), seconds },
      entries,
    );
    if (routine && changed && saveToRoutine && items.length > 0) {
      saveRoutine({ id: routine.id, name: routine.name, exercises: toRoutineExercises(items, planned) });
    }
    active.discard();
    router.back();
  };

  const discard = () =>
    confirm('Discard workout?', 'Nothing from this workout will be saved.', 'Discard', () => {
      active.discard();
      router.back();
    });

  return (
    <>
      <Stack.Screen
        options={{
          title: workout.routineName,
          headerRight: () => (
            <Pressable
              onPress={() => setTimerOpen(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Edit timer"
              style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="time-outline" size={20} color={t.workout} />
              <Text style={[styles.headerLabel, { color: t.workout }]}>Edit time</Text>
            </Pressable>
          ),
        }}
      />
      {timerOpen ? (
        <EditTimerModal
          seconds={seconds}
          onClose={() => setTimerOpen(false)}
          onApply={(s) => {
            active.setElapsed(s);
            setTimerOpen(false);
          }}
        />
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Card>
            <View style={styles.timerRow}>
              <Ionicons name="stopwatch-outline" size={28} color={t.workout} />
              <Pressable
                style={styles.flex}
                onPress={() => setTimerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Training time ${formatDuration(seconds)}${paused ? ', paused' : ''}. Tap to edit`}>
                <Text style={[styles.timer, { color: paused ? t.textSecondary : t.text }]}>
                  {formatDuration(seconds)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
                onPress={paused ? active.resume : active.pause}
                style={({ pressed }) => [
                  styles.roundButton,
                  { backgroundColor: paused ? t.workout : t.field, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Ionicons name={paused ? 'play' : 'pause'} size={24} color={paused ? t.onAccent : t.text} />
              </Pressable>
            </View>
            <Muted>
              {doneCount} of {totalCount} {totalCount === 1 ? 'set' : 'sets'} done
              {workout.autoStoppedAt !== null
                ? ' · timer stopped, everything is checked off'
                : paused
                  ? ' · paused'
                  : ''}
            </Muted>
            <Muted>Leave this screen whenever you like. The workout keeps running in the bar at the bottom.</Muted>
          </Card>

          <RestCard
            left={rest}
            restSeconds={active.restSeconds}
            onChoose={active.setRestSeconds}
            onAdjust={active.adjustRest}
            onSkip={active.skipRest}
          />

          {items.map((item) => (
            <Card
              key={item.id}
              title={item.name}
              right={
                <Pressable
                  onPress={() => removeItem(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name} from this workout`}>
                  <Ionicons name="close-circle" size={22} color={t.textSecondary} />
                </Pressable>
              }>
              {item.kind === 'strength' ? (
                <>
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
                        onPress={() => toggleSet(item.id, s)}
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
                </>
              ) : (
                <>
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
                </>
              )}
            </Card>
          ))}

          <Card title="Add to this workout">
            <Dropdown
              value={null}
              options={exerciseOptions}
              placeholder="+ Add exercise"
              color={t.workout}
              accessibilityLabel="Add exercise"
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
              accessibilityLabel="Add cardio"
              onSelect={addCardio}
            />
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={discard}
            style={({ pressed }) => [styles.discard, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.linkLabel, { color: t.bad }]}>Discard workout</Text>
          </Pressable>
        </ScrollView>
        <View
          style={[
            styles.footer,
            { backgroundColor: t.background, borderColor: t.border, paddingBottom: 12 + insets.bottom },
          ]}>
          {changed && items.length > 0 ? (
            <Toggle
              label={`Save exercise changes to "${routine?.name}"`}
              value={saveToRoutine}
              color={t.workout}
              onChange={setSaveToRoutine}
            />
          ) : null}
          <Button label="Finish workout" color={t.good} disabled={doneCount === 0} onPress={finish} />
          {doneCount === 0 ? <Muted style={styles.center}>Check off at least one set to finish.</Muted> : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** Rest countdown after a checked-off set, plus the choice of how long to rest. */
function RestCard({
  left,
  restSeconds,
  onChoose,
  onAdjust,
  onSkip,
}: {
  left: number | null;
  restSeconds: number;
  onChoose: (seconds: number) => void;
  onAdjust: (by: number) => void;
  onSkip: () => void;
}) {
  const t = useTheme();
  const resting = left !== null && left > 0;
  const over = left === 0;

  return (
    <Card title="Rest between sets">
      {resting ? (
        <View style={styles.restRow}>
          <Text style={[styles.restTime, { color: t.workout }]} accessibilityRole="timer">
            {formatDuration(left)}
          </Text>
          <SmallButton label="−15s" onPress={() => onAdjust(-15)} />
          <SmallButton label="+15s" onPress={() => onAdjust(15)} />
          <SmallButton label="Skip" onPress={onSkip} />
        </View>
      ) : over ? (
        <View style={styles.restRow}>
          <Text style={[styles.restDone, { color: t.good }]}>Rest is over, next set!</Text>
          <SmallButton label="OK" onPress={onSkip} />
        </View>
      ) : (
        <Muted>
          {restSeconds > 0
            ? `A ${formatDuration(restSeconds)} countdown starts each time you check off a set.`
            : 'The rest timer is off.'}
        </Muted>
      )}
      <View style={styles.restOptions}>
        {REST_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={s === 0 ? 'Off' : formatDuration(s)}
            color={t.workout}
            selected={s === restSeconds}
            onPress={() => onChoose(s)}
          />
        ))}
      </View>
    </Card>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.small, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.smallLabel, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Sets the timer to a typed time. A running timer keeps counting from there. */
function EditTimerModal({
  seconds,
  onClose,
  onApply,
}: {
  seconds: number;
  onClose: () => void;
  onApply: (seconds: number) => void;
}) {
  const t = useTheme();
  // Mounted fresh each time the sheet opens, so it starts from the time on the clock.
  const [minutes, setMinutes] = useState(() => String(Math.floor(seconds / 60)));
  const [secs, setSecs] = useState(() => String(seconds % 60));

  const m = minutes.trim() === '' ? 0 : parseAmount(minutes);
  const s = secs.trim() === '' ? 0 : parseAmount(secs);
  const valid = m !== null && s !== null && s < 60 && (m > 0 || s > 0);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: t.text }]}>Edit timer</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={t.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Muted>
            Set how long you have trained so far. The timer keeps counting from the new time, and
            you can still pause it. You can change the date afterwards under Progress.
          </Muted>
          <View style={styles.setRow}>
            <View style={styles.labeled}>
              <Muted>Minutes</Muted>
              <Field
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                returnKeyType="done"
                accessibilityLabel="Minutes"
              />
            </View>
            <View style={styles.labeled}>
              <Muted>Seconds</Muted>
              <Field
                value={secs}
                onChangeText={setSecs}
                keyboardType="number-pad"
                returnKeyType="done"
                accessibilityLabel="Seconds"
              />
            </View>
          </View>
          {!valid ? <Text style={[styles.error, { color: t.bad }]}>Enter a time, seconds below 60.</Text> : null}
          <Button
            label="Use this time"
            color={t.workout}
            disabled={!valid}
            onPress={() => {
              if (valid && m !== null && s !== null) onApply(Math.round(m * 60 + s));
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timer: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  roundButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restTime: { flex: 1, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  restDone: { flex: 1, fontSize: 17, fontWeight: '700' },
  restOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { height: 40, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  smallLabel: { fontSize: 15, fontWeight: '600' },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -6 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { width: 28, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  checkSpace: { width: 48 },
  check: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doneField: { opacity: 0.6 },
  setActions: { flexDirection: 'row', gap: 20 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkLabel: { fontSize: 15, fontWeight: '600' },
  discard: { alignSelf: 'center', padding: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  center: { textAlign: 'center' },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  headerLabel: { fontSize: 16, fontWeight: '600' },
  labeled: { flex: 1, gap: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  error: { fontSize: 13 },
});
