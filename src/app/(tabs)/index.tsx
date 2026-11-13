import { DayView } from '@/components/day-view';
import { useToday } from '@/lib/dates';

export default function TodayScreen() {
  const today = useToday();
  // Keyed by date so the inputs reset when the day rolls over.
  return <DayView key={today} date={today} />;
}
