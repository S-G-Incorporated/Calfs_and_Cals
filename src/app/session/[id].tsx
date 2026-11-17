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
import { parseWhen, type WhenDraft, whenFromSession, WorkoutWhenFields } from '@/components/workout-when';
import {
  newId,
  parseAmount,
  parseNumber,
  type Session,
  useStore,
  type Workout,
  type WorkoutEntry,
} from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { CARDIO_ACTIVITIES, EXERCISES } from '@/lib/workouts';

type SetDraft = { id: string; reps: string; kg: string };
type Group =
  | { id: string; kind: 'strength'; name: string; sets: SetDraft[] }
  | { id: string; kind: 'cardio'; name: string; km: string; minutes: string };

const toText = (n: number | null) => (n === null ? '' : String(n));

/** Groups a session's logged sets by exercise, in the order they were logged. */
function toGroups(workouts: Workout[]): Group[] {
  const groups: Group[] = [];
  for (const w of workouts) {
    if (w.kind === 'cardio') {
      groups.push({ id: w.id, kind: 'cardio', name: w.activity, km: toText(w.km), minutes: toText(w.minutes) });
      continue;
    }
    const last = groups[groups.length - 1];
    const set = { id: w.id, reps: String(w.reps), kg: String(w.kg) };
    if (last?.kind === 'strength' && last.name === w.exercise) last.sets.push(set);
    else groups.push({ id: newId(), kind: 'strength', name: w.exercise, sets: [set] });
  }
  return groups;
}

function toEntries(groups: Group[]): WorkoutEntry[] {
  return groups.flatMap((g): WorkoutEntry[] => {
    if (g.kind === 'cardio') {
      const minutes = parseNumber(g.minutes);
      return [{ kind: 'cardio', activity: g.name, km: parseNumber(g.km), minutes: minutes === null ? null : Math.round(minutes) }];
    }
    return g.sets.flatMap((s) => {
      const reps = parseNumber(s.reps);
      return reps === null ? [] : [{ kind: 'strength' as const, exercise: g.name, reps: Math.round(reps), kg: parseAmount(s.kg) ?? 0 }];
    });
  });
}

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

/** Edit a finished workout: its name, when it happened, and every logged set and cardio. */
export default function SessionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const session = data.sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Edit workout' }} />
        <Muted>This workout no longer exists.</Muted>
      </View>
    );
  }
  return <SessionEditor session={session} workouts={data.workouts.filter((w) => w.sessionId === session.id)} />;
}

function SessionEditor({ session, workouts }: { session: Session; workouts: Workout[] }) {
  const t = useTheme();
  const { data, updateSession, removeSession, addExercise, removeExercise } = useStore();

  const [name, setName] = useState(session.routineName);
  const [when, setWhen] = useState<WhenDraft>(() => whenFromSession(session.finishedAt, session.seconds));
  const [groups, setGroups] = useState<Group[]>(() => toGroups(workouts));
  const whenResult = parseWhen(when);

  const exerciseOptions = [
    ...EXERCISES.map((label) => ({ label })),
    ...[...data.customExercises].sort().map((label) => ({ label, custom: true })),
  ];

  const update = (groupId: string, fn: (g: Group) => Group) =>
    setGroups((list) => list.map((g) => (g.id === groupId ? fn(g) : g)));
  const updateSet = (groupId: string, setId: string, patch: Partial<SetDraft>) =>
    update(groupId, (g) =>
      g.kind === 'strength' ? { ...g, sets: g.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : g,
    );
  const removeSet = (groupId: string, setId: string) =>
    update(groupId, (g) => (g.kind === 'strength' ? { ...g, sets: g.sets.filter((s) => s.id !== setId) } : g));
  const addSet = (groupId: string) =>
    update(groupId, (g) => {
      if (g.kind !== 'strength') return g;
      const last = g.sets[g.sets.length - 1];
      return { ...g, sets: [...g.sets, { id: newId(), reps: last?.reps ?? '', kg: last?.kg ?? '' }] };
    });
  const removeGroup = (groupId: string) => setGroups((list) => list.filter((g) => g.id !== groupId));

  const entries = toEntries(groups);
  const canSave = name.trim() !== '' && !('error' in whenResult) && entries.length > 0;

  const save = () => {
    if (!canSave || 'error' in whenResult) return;
    updateSession(
      session.id,
      { routineId: session.routineId, routineName: name.trim(), ...whenResult },
      entries,
    );
    router.back();
  };

  const remove = () =>
    confirm('Delete workout?', 'The workout and all its sets will be removed.', 'Delete', () => {
      removeSession(session.id);
      router.back();
    });

  return (
    <>
      <Stack.Screen options={{ title: 'Edit workout' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Card title="Workout">
            <Labeled label="Name">
              <Field value={name} onChangeText={setName} placeholder="Name" accessibilityLabel="Workout name" />
            </Labeled>
            <WorkoutWhenFields value={when} onChange={setWhen} />
            {'error' in whenResult ? (
              <Text style={[styles.error, { color: t.bad }]}>{whenResult.error}</Text>
            ) : null}
          </Card>

          {groups.map((g) => (
            <Card
              key={g.id}
              right={
                <Pressable
                  onPress={() => removeGroup(g.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${g.name}`}>
                  <Ionicons name="trash-outline" size={20} color={t.textSecondary} />
                </Pressable>
              }
              title={g.kind === 'strength' ? 'Exercise' : 'Cardio'}>
              {g.kind === 'strength' ? (
                <>
                  <Dropdown
                    value={g.name}
                    options={exerciseOptions}
                    placeholder="Exercise"
                    color={t.workout}
                    accessibilityLabel="Exercise"
                    addPlaceholder="Exercise name"
                    onSelect={(exercise) => update(g.id, (x) => ({ ...x, name: exercise }))}
                    onAdd={addExercise}
                    onRemove={removeExercise}
                  />
                  <View style={styles.setRow}>
                    <View style={styles.index} />
                    <Muted style={styles.flex}>Reps</Muted>
                    <Muted style={styles.flex}>kg</Muted>
                    <View style={styles.removeSpace} />
                  </View>
                  {g.sets.map((s, index) => (
                    <View key={s.id} style={styles.setRow}>
                      <Text style={[styles.index, { color: t.text }]}>{index + 1}</Text>
                      <Field
                        flex={1}
                        value={s.reps}
                        onChangeText={(reps) => updateSet(g.id, s.id, { reps })}
                        placeholder="reps"
                        keyboardType="number-pad"
                        returnKeyType="done"
                        accessibilityLabel={`Reps for set ${index + 1} of ${g.name}`}
                      />
                      <Field
                        flex={1}
                        value={s.kg}
                        onChangeText={(kg) => updateSet(g.id, s.id, { kg })}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        accessibilityLabel={`Weight for set ${index + 1} of ${g.name}`}
                      />
                      <Pressable
                        onPress={() => removeSet(g.id, s.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove set ${index + 1} of ${g.name}`}
                        style={styles.removeSpace}>
                        <Ionicons name="close-circle" size={22} color={t.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addSet(g.id)}
                    style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name="add" size={18} color={t.workout} />
                    <Text style={[styles.linkLabel, { color: t.workout }]}>Add set</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Dropdown
                    value={g.name}
                    options={CARDIO_ACTIVITIES.map((label) => ({ label }))}
                    placeholder="Activity"
                    color={t.workout}
                    accessibilityLabel="Cardio"
                    onSelect={(activity) => update(g.id, (x) => ({ ...x, name: activity }))}
                  />
                  <View style={styles.setRow}>
                    <Labeled label="km">
                      <Field
                        value={g.km}
                        onChangeText={(km) => update(g.id, (x) => ({ ...x, km }) as Group)}
                        placeholder="–"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        accessibilityLabel={`Distance for ${g.name}`}
                      />
                    </Labeled>
                    <Labeled label="min">
                      <Field
                        value={g.minutes}
                        onChangeText={(minutes) => update(g.id, (x) => ({ ...x, minutes }) as Group)}
                        placeholder="–"
                        keyboardType="number-pad"
                        returnKeyType="done"
                        accessibilityLabel={`Time for ${g.name}`}
                      />
                    </Labeled>
                  </View>
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
              accessibilityLabel="Exercise"
              addPlaceholder="Exercise name"
              onSelect={(exercise) =>
                setGroups((list) => [
                  ...list,
                  { id: newId(), kind: 'strength', name: exercise, sets: [{ id: newId(), reps: '', kg: '' }] },
                ])
              }
              onAdd={addExercise}
              onRemove={removeExercise}
            />
            <Dropdown
              value={null}
              options={CARDIO_ACTIVITIES.map((label) => ({ label }))}
              placeholder="+ Add cardio"
              color={t.workout}
              accessibilityLabel="Cardio"
              onSelect={(activity) =>
                setGroups((list) => [...list, { id: newId(), kind: 'cardio', name: activity, km: '', minutes: '' }])
              }
            />
          </Card>

          <Button label="Save changes" color={t.workout} disabled={!canSave} onPress={save} />
          {entries.length === 0 ? (
            <Muted style={styles.center}>Add at least one set with reps, or a cardio entry.</Muted>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={remove}
            style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.deleteLabel, { color: t.bad }]}>Delete workout</Text>
          </Pressable>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  labeled: { flex: 1, gap: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  index: { width: 20, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  removeSpace: { width: 24, alignItems: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  linkLabel: { fontSize: 15, fontWeight: '600' },
  error: { fontSize: 13 },
  center: { textAlign: 'center' },
  delete: { alignSelf: 'center', padding: 8 },
  deleteLabel: { fontSize: 16, fontWeight: '600' },
});
