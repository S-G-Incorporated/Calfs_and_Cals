import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Muted } from '@/components/ui';
import { type DateKey, formatRelative, toKey, useToday } from '@/lib/dates';
import { type Routine, type Session, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { routineItemName } from '@/lib/workouts';

/** Training start page: the user's routines, most recently created or edited first. */
export default function TrainRoutinesScreen() {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();
  const routines = [...data.routines].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <FlatList
      data={routines}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Button label="New routine" color={t.workout} onPress={() => router.push('/routine/new')} />
      }
      ListEmptyComponent={
        <View style={[styles.empty, { backgroundColor: t.card }]}>
          <Ionicons name="barbell-outline" size={36} color={t.workout} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>No routines yet</Text>
          <Muted style={styles.center}>
            Create a routine, add the exercises you do, and it shows up here.
          </Muted>
        </View>
      }
      renderItem={({ item }) => (
        <RoutineCard
          routine={item}
          today={today}
          lastSession={data.sessions.findLast((s) => s.routineId === item.id)}
        />
      )}
    />
  );
}

/** "today", "yesterday" or "Mon 3 Nov". */
function dayLabel(date: DateKey, today: DateKey): string {
  const when = formatRelative(date, today);
  return when === 'Today' || when === 'Yesterday' ? when.toLowerCase() : when;
}

function RoutineCard({
  routine,
  today,
  lastSession,
}: {
  routine: Routine;
  today: DateKey;
  lastSession: Session | undefined;
}) {
  const t = useTheme();
  const count = routine.exercises.length;
  const names = routine.exercises.map(routineItemName).join(', ');

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: t.field }]}>
          <Ionicons name="barbell" size={20} color={t.workout} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {routine.name}
          </Text>
          <Muted>
            {count} {count === 1 ? 'exercise' : 'exercises'} · edited{' '}
            {dayLabel(toKey(new Date(routine.updatedAt)), today)}
          </Muted>
          {lastSession ? <Muted>Last done {dayLabel(lastSession.date, today)}</Muted> : null}
          {names ? (
            <Text style={[styles.names, { color: t.textSecondary }]} numberOfLines={2}>
              {names}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${routine.name}`}
          onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })}
          style={({ pressed }) => [styles.action, { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="create-outline" size={18} color={t.text} />
          <Text style={[styles.actionLabel, { color: t.text }]}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start ${routine.name}`}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: routine.id } })}
          style={({ pressed }) => [styles.action, { backgroundColor: t.workout, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="play" size={18} color={t.onAccent} />
          <Text style={[styles.actionLabel, { color: t.onAccent }]}>Start</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { borderRadius: 16, padding: 24, gap: 8, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  center: { textAlign: 'center' },
  card: { borderRadius: 16, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700' },
  names: { marginTop: 2, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionLabel: { fontSize: 16, fontWeight: '700' },
});
