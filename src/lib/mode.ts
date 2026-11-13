import type { Theme } from './theme';

/**
 * The app has two separate sections, chosen on launch:
 * training (workouts) and calorie tracking (food and body weight).
 */
export type Mode = 'train' | 'calories';

export function isMode(value: unknown): value is Mode {
  return value === 'train' || value === 'calories';
}

export const MODE_LABEL: Record<Mode, string> = { train: 'Train', calories: 'Calories' };

/** Accent colour for a section. */
export function modeColor(mode: Mode, t: Theme): string {
  return mode === 'train' ? t.workout : t.calories;
}
