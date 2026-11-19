import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  countDone,
  countTotal,
  elapsedSeconds,
  restLeft,
  useActiveWorkout,
  useNow,
} from '@/lib/active-workout';
import { useTheme } from '@/lib/theme';
import { formatDuration } from '@/lib/workouts';

/**
 * A slim bar for the workout in progress, shown at the bottom of the app while the workout
 * screen is closed. Tapping it opens the workout again. Renders nothing when no workout runs.
 */
export function MiniWorkoutBar({ bottomInset = 0 }: { bottomInset?: number }) {
  const t = useTheme();
  const { workout } = useActiveWorkout();
  const now = useNow(workout !== null);
  if (!workout) return null;

  const seconds = elapsedSeconds(workout, now);
  const rest = restLeft(workout, now);
  const paused = workout.runningSince === null;
  const done = countDone(workout.items);
  const total = countTotal(workout.items);
  const status = paused
    ? workout.autoStoppedAt !== null
      ? 'All sets done · ready to finish'
      : 'Paused'
    : rest !== null && rest > 0
      ? `Rest ${formatDuration(rest)}`
      : `${done} of ${total} sets done`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open workout ${workout.routineName}, ${formatDuration(seconds)}, ${status}`}
      onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.routineId } })}
      style={({ pressed }) => [
        styles.bar,
        {
          backgroundColor: t.workout,
          paddingBottom: 10 + bottomInset,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Ionicons name={paused ? 'pause' : 'stopwatch'} size={22} color={t.onAccent} />
      <View style={styles.text}>
        <Text style={[styles.name, { color: t.onAccent }]} numberOfLines={1}>
          {workout.routineName}
        </Text>
        <Text style={[styles.status, { color: t.onAccent }]} numberOfLines={1}>
          {status}
        </Text>
      </View>
      <Text style={[styles.time, { color: t.onAccent }]}>{formatDuration(seconds)}</Text>
      <Ionicons name="chevron-up" size={22} color={t.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 13, opacity: 0.9 },
  time: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
