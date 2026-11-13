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
