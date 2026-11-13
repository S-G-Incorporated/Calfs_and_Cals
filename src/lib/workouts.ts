import type { DateKey } from './dates';
import type { Cardio, StrengthSet, Workout } from './store';

/** Strength exercises offered out of the box. The user can add their own. */
export const EXERCISES = [
  'Bench press',
  'Squat',
  'Deadlift',
  'Overhead press',
  'Barbell row',
  'Incline bench press',
  'Pull-up',
  'Lat pulldown',
  'Dumbbell curl',
  'Tricep extension',
  'Leg press',
  'Romanian deadlift',
  'Leg curl',
  'Calf raise',
  'Hip thrust',
  'Dips',
];

export const CARDIO_ACTIVITIES = ['Run', 'Cycle', 'Stairs', 'Walk', 'Swim'];

/** Entries the app stored before strength and cardio were separated: a type and a duration. */
type LegacyWorkout = { id: string; date: DateKey; type: string; minutes: number; at: number };

/** Upgrades an entry saved by an older version of the app. */
export function migrateWorkout(w: Workout | LegacyWorkout): Workout {
  if ('kind' in w) return w;
  return { id: w.id, date: w.date, at: w.at, kind: 'cardio', activity: w.type, minutes: w.minutes, km: null };
}

export function isStrength(w: Workout): w is StrengthSet {
  return w.kind === 'strength';
}

export function isCardio(w: Workout): w is Cardio {
  return w.kind === 'cardio';
}

/** Number of distinct days with at least one entry between `from` and `to` inclusive. */
export function trainingDays(workouts: Workout[], from: DateKey, to: DateKey): number {
  return new Set(workouts.filter((w) => w.date >= from && w.date <= to).map((w) => w.date)).size;
}

/** Heaviest set logged for an exercise, or null if it was never logged. */
export function bestSet(workouts: Workout[], exercise: string): StrengthSet | null {
  let best: StrengthSet | null = null;
  for (const w of workouts) {
    if (!isStrength(w) || w.exercise !== exercise) continue;
    if (!best || w.kg > best.kg || (w.kg === best.kg && w.reps > best.reps)) best = w;
  }
  return best;
}

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** "8 × 60 kg" */
export function describeSet(s: StrengthSet): string {
  return `${s.reps} × ${trim(s.kg)} kg`;
}

/** "5.2 km · 30 min", leaving out whatever was not recorded. */
export function describeCardio(c: Cardio): string {
  const parts = [c.km !== null ? `${trim(c.km)} km` : null, c.minutes !== null ? `${c.minutes} min` : null];
  return parts.filter(Boolean).join(' · ') || 'Logged';
}

/** One line summing up a day's training: "12 sets · 5.2 km · 30 min cardio". */
export function describeDay(workouts: Workout[]): string | null {
  const sets = workouts.filter(isStrength).length;
  const cardio = workouts.filter(isCardio);
  const km = cardio.reduce((sum, c) => sum + (c.km ?? 0), 0);
  const minutes = cardio.reduce((sum, c) => sum + (c.minutes ?? 0), 0);
  const parts = [
    sets > 0 ? `${sets} ${sets === 1 ? 'set' : 'sets'}` : null,
    km > 0 ? `${trim(km)} km` : null,
    minutes > 0 ? `${minutes} min cardio` : null,
    cardio.length > 0 && km === 0 && minutes === 0 ? `${cardio.length} cardio` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
