import { type ActiveWorkout, elapsedSeconds, syncAutoStop } from '../active-workout';

const workout = (done: boolean[], patch: Partial<ActiveWorkout> = {}): ActiveWorkout => ({
  routineId: 'r',
  routineName: 'Push',
  items: [
    {
      id: 'a',
      kind: 'strength',
      name: 'Bench press',
      sets: done.map((d, i) => ({ id: String(i), reps: '8', kg: '60', done: d })),
    },
  ],
  baseSeconds: 0,
  runningSince: 0,
  autoStoppedAt: null,
  restEndsAt: null,
  ...patch,
});

describe('workout timer', () => {
  it('keeps counting while sets are left', () => {
    const w = syncAutoStop(workout([true, false]), 60_000);
    expect(w.runningSince).toBe(0);
    expect(elapsedSeconds(w, 60_000)).toBe(60);
  });

  it('stops when every set is checked off and drops the rest timer', () => {
    const w = syncAutoStop(workout([true, true], { restEndsAt: 90_000 }), 60_000);
    expect(w.runningSince).toBeNull();
    expect(w.restEndsAt).toBeNull();
    expect(elapsedSeconds(w, 600_000)).toBe(60);
  });

  it('picks up from where it stopped when a set is unchecked again', () => {
    const stopped = syncAutoStop(workout([true, true]), 60_000);
    const resumed = syncAutoStop({ ...stopped, items: workout([true, false]).items }, 120_000);
    expect(resumed.runningSince).toBe(60_000);
    expect(elapsedSeconds(resumed, 120_000)).toBe(120);
  });

  it('does not restart a timer the user paused', () => {
    const paused = workout([true, false], { runningSince: null, baseSeconds: 30 });
    expect(syncAutoStop(paused, 60_000)).toBe(paused);
  });
});
