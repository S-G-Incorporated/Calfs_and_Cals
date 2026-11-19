import { type Data, normalize } from '../store';

describe('loading saved data', () => {
  it('fills in every field on a first launch', () => {
    expect(normalize({}).profile).toEqual({
      heightCm: null,
      sex: null,
      birthDate: null,
      activity: null,
      targetDate: null,
      startPage: null,
      startPageAsked: false,
    });
  });

  it('turns an old number of weeks into a target date and drops the old typed age', () => {
    const { profile } = normalize({
      profile: { weeksToGoal: 10, targetStart: '2026-11-11', age: 25, heightCm: 180 },
    } as unknown as Partial<Data>);
    expect(profile.targetDate).toBe('2027-01-20');
    expect(profile.heightCm).toBe(180);
    expect(profile).not.toHaveProperty('weeksToGoal');
    expect(profile).not.toHaveProperty('age');
  });
});
