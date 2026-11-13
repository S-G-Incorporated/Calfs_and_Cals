import { CalorieDayView } from '@/components/calorie-day';
import { useToday } from '@/lib/dates';

export default function CaloriesTodayScreen() {
  const today = useToday();
  // Keyed by date so the inputs reset when the day rolls over.
  return <CalorieDayView key={today} date={today} />;
}
