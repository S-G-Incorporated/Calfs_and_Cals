import { caloriePlan, maintenanceCalories } from '../body';

// Maintenance for this man is 2,619 kcal a day.
const man = (targetKg: number, days: number) =>
  caloriePlan('male', 90, 180, 25, 'light', targetKg, days);

describe('calorie plan', () => {
  it('estimates daily energy use with Mifflin-St Jeor and the activity factor', () => {
    // (10*90 + 6.25*180 - 5*25 + 5) * 1.375
    expect(maintenanceCalories('male', 90, 180, 25, 'light')).toBe(Math.round(1905 * 1.375));
  });

  it('spreads 7,700 kcal per kg over the days left', () => {
    const plan = man(82, 56);
    expect(plan.dailyChange).toBe(1100); // 8 kg * 7,700 / 56 days
    expect(plan.dailyCalories).toBe(2619 - 1100);
    expect(plan.warning).toBeNull();
  });

  it('warns when the budget drops below the safe minimum', () => {
    expect(man(82, 14).warning?.reason).toBe('belowMinimum');
  });

  it('warns when the weight changes more than 1 kg a week', () => {
    expect(man(95, 21).warning?.reason).toBe('tooFast');
  });

  // Regression: the suggestion used to fix only the first problem found, so following it
  // could trigger the other warning straight away.
  it('suggests a number of days that clears every warning', () => {
    const plan = (days: number) => caloriePlan('male', 130, 190, 30, 'active', 120, days);
    const { warning } = plan(14);
    expect(warning).not.toBeNull();
    expect(plan(warning!.suggestedDays).warning).toBeNull();
  });
});
