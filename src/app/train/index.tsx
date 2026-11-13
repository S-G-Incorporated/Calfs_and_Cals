import { WorkoutDayView } from '@/components/workout-day';
import { useToday } from '@/lib/dates';

export default function TrainTodayScreen() {
  const today = useToday();
  // Keyed by date so the inputs reset when the day rolls over.
  return <WorkoutDayView key={today} date={today} />;
}
