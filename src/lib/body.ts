/** Body mass index from weight in kg and height in cm, rounded to one decimal. */
export function bmi(kg: number, cm: number): number {
  const m = cm / 100;
  return Math.round((kg / (m * m)) * 10) / 10;
}

/** WHO adult BMI classes. */
export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Normal weight';
  if (value < 30) return 'Overweight';
  return 'Obese';
}

/** Weight span in kg that gives a BMI of 18.5 to 24.9 at this height. */
export function healthyWeightRange(cm: number): { min: number; max: number } {
  const m2 = (cm / 100) ** 2;
  return { min: Math.round(18.5 * m2), max: Math.round(24.9 * m2) };
}

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';

/** Multipliers applied to the basal rate to estimate daily energy use. */
export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Light', hint: 'Exercise 1–3 days a week', factor: 1.375 },
  { value: 'moderate', label: 'Moderate', hint: 'Exercise 3–5 days a week', factor: 1.55 },
  { value: 'active', label: 'Active', hint: 'Hard exercise 6–7 days a week', factor: 1.725 },
  { value: 'veryActive', label: 'Very active', hint: 'Physical job or training twice a day', factor: 1.9 },
];

/** Basal metabolic rate in kcal/day (Mifflin-St Jeor). */
export function bmr(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** Estimated daily energy use in kcal, i.e. what keeps the weight where it is. */
export function maintenanceCalories(
  sex: Sex,
  kg: number,
  cm: number,
  age: number,
  activity: ActivityLevel,
): number {
  const factor = ACTIVITY_LEVELS.find((a) => a.value === activity)?.factor ?? 1.2;
  return Math.round(bmr(sex, kg, cm, age) * factor);
}

/** Energy in one kilogram of body fat, the usual planning figure. */
const KCAL_PER_KG = 7700;

/** Fewer calories than this per day is not advised without medical supervision. */
export function minimumCalories(sex: Sex): number {
  return sex === 'male' ? 1500 : 1200;
}

export type CaloriePlan = {
  maintenance: number;
  /** Positive when losing weight, negative when gaining. */
  kgToChange: number;
  kgPerWeek: number;
  /** Daily deficit (positive) or surplus (negative) needed. */
  dailyChange: number;
  /** Calories to eat per day to reach the target in time. */
  dailyCalories: number;
  /** Set when the plan is too aggressive, with the fewest weeks that would keep it sensible. */
  warning: { reason: 'belowMinimum' | 'tooFast'; suggestedWeeks: number } | null;
};

/** Daily calorie budget that moves from `kg` to `targetKg` in `weeks`. */
export function caloriePlan(
  sex: Sex,
  kg: number,
  cm: number,
  age: number,
  activity: ActivityLevel,
  targetKg: number,
  weeks: number,
): CaloriePlan {
  const maintenance = maintenanceCalories(sex, kg, cm, age, activity);
  const kgToChange = kg - targetKg;
  const kgPerWeek = kgToChange / weeks;
  const dailyChange = Math.round((kgToChange * KCAL_PER_KG) / (weeks * 7));
  const dailyCalories = maintenance - dailyChange;

  let warning: CaloriePlan['warning'] = null;
  const minimum = minimumCalories(sex);
  const totalKcal = Math.abs(kgToChange) * KCAL_PER_KG;
  if (kgToChange > 0 && dailyCalories < minimum) {
    const maxDeficit = Math.max(1, maintenance - minimum);
    warning = { reason: 'belowMinimum', suggestedWeeks: Math.ceil(totalKcal / (maxDeficit * 7)) };
  } else if (Math.abs(kgPerWeek) > 1) {
    warning = { reason: 'tooFast', suggestedWeeks: Math.ceil(Math.abs(kgToChange)) };
  }

  return { maintenance, kgToChange, kgPerWeek, dailyChange, dailyCalories, warning };
}
