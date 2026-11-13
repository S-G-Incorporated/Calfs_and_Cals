import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { DayView } from '@/components/day-view';
import { formatLong, isDateKey, todayKey } from '@/lib/dates';

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = isDateKey(params.date) ? params.date : todayKey();

  return (
    <>
      <Stack.Screen options={{ title: formatLong(date) }} />
      <DayView date={date} />
    </>
  );
}
