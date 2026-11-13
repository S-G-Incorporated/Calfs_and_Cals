import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { CalorieDayView } from '@/components/calorie-day';
import { WorkoutDayView } from '@/components/workout-day';
import { formatLong, isDateKey, todayKey } from '@/lib/dates';
import { isMode, MODE_LABEL } from '@/lib/mode';

/** A past day, opened from either section's history. `mode` picks which section it shows. */
export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string; mode?: string }>();
  const date = isDateKey(params.date) ? params.date : todayKey();
  const mode = isMode(params.mode) ? params.mode : 'calories';

  return (
    <>
      <Stack.Screen options={{ title: `${MODE_LABEL[mode]} · ${formatLong(date)}` }} />
      {mode === 'train' ? <WorkoutDayView date={date} /> : <CalorieDayView date={date} />}
    </>
  );
}
