import { type Data, normalize } from '../store';
import { targetStatus } from '../target';

const TODAY = '2026-11-18';

/** A complete profile: 90 kg man, born 25 Dec 2000, aiming for 82 kg by 13 Jan 2027. */
function data(profile: Partial<Data['profile']> = {}): Data {
  const base = normalize({
    weights: { '2026-11-01': 92, '2026-11-18': 90 },
    goals: { dailyCalories: null, weeklyWorkouts: null, targetWeight: 82 },
  });
  return {
    ...base,
    profile: {
      ...base.profile,
      sex: 'male',
      birthDate: '2000-12-25',
      heightCm: 180,
      activity: 'light',
      targetDate: '2027-01-13',
      ...profile,
    },
  };
}

describe('target weight status', () => {
  it('builds a plan from the latest weight and the days to the target date', () => {
    const status = targetStatus(data(), TODAY);
    expect(status.weight).toBe(90);
    expect(status.daysLeft).toBe(56);
    expect(status.plan?.dailyCalories).toBe(2619 - 1100);
  });

  it('works out the age from the birth date, so it updates on the birthday', () => {
    const before = targetStatus(data(), '2026-12-24').maintenance!; // 25 years old
    const after = targetStatus(data(), '2026-12-25').maintenance!; // 26 years old
    expect(before - after).toBe(Math.round(1905 * 1.375) - Math.round(1900 * 1.375));
  });

  it('has no plan once the target date has passed', () => {
    const status = targetStatus(data({ targetDate: '2026-11-01' }), TODAY);
    expect(status.daysLeft).toBe(-17);
    expect(status.plan).toBeNull();
  });
});
