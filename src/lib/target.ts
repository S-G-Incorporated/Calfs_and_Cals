import { type CaloriePlan, caloriePlan, maintenanceCalories } from './body';
import { type DateKey, daysBetween } from './dates';
import { type Data, latestWeight } from './store';

export type TargetStatus = {
  weight: number | null;
  target: number | null;
  /** Positive when losing, negative when gaining; null without a weight or target. */
  kgToChange: number | null;
  /** Days until the planned date; null when no timeline is set. Can be zero or negative. */
  daysLeft: number | null;
  /** Estimated daily energy use, when the profile has enough detail. */
  maintenance: number | null;
  /** Calorie budget for the days that remain; null when anything is missing or time is up. */
  plan: CaloriePlan | null;
  /** Profile fields still needed for a plan, in plain words. */
  missing: string[];
};

/** Everything the profile and target screens show about the target weight, from one place. */
export function targetStatus(data: Data, today: DateKey): TargetStatus {
  const { heightCm, sex, age, activity, weeksToGoal, targetStart } = data.profile;
  const weight = latestWeight(data.weights, today);
  const target = data.goals.targetWeight;
  const kgToChange = weight !== null && target !== null ? weight - target : null;

  const daysLeft =
    weeksToGoal !== null ? weeksToGoal * 7 - daysBetween(targetStart ?? today, today) : null;

  const maintenance =
    sex !== null && weight !== null && heightCm !== null && age !== null && activity !== null
      ? maintenanceCalories(sex, weight, heightCm, age, activity)
      : null;

  const plan =
    sex !== null &&
    weight !== null &&
    heightCm !== null &&
    age !== null &&
    activity !== null &&
    target !== null &&
    daysLeft !== null &&
    daysLeft > 0
      ? caloriePlan(sex, weight, heightCm, age, activity, target, daysLeft / 7)
      : null;

  const missing = [
    sex === null ? 'sex' : null,
    age === null ? 'age' : null,
    heightCm === null ? 'height' : null,
    weight === null ? 'weight' : null,
    activity === null ? 'activity level' : null,
    target === null ? 'target weight' : null,
    weeksToGoal === null ? 'number of weeks' : null,
  ].filter((m): m is string => m !== null);

  return { weight, target, kgToChange, daysLeft, maintenance, plan, missing };
}

/** "6 weeks and 3 days left", "Last day today" or "Deadline passed". */
export function describeDaysLeft(days: number): string {
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Last day today';
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  const parts = [
    weeks > 0 ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : null,
    rest > 0 ? `${rest} ${rest === 1 ? 'day' : 'days'}` : null,
  ].filter(Boolean);
  return `${parts.join(' and ')} left`;
}

/** "sex, age and height" */
export function listWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
