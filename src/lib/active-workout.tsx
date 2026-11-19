import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, use, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';

import { newId, type Routine, type RoutineExercise, useStore } from './store';

/**
 * The workout in progress lives in its own storage key so it survives leaving the screen,
 * backgrounding the app and the app being killed. All times are wall-clock timestamps, so the
 * timers keep counting while the phone is locked.
 */
const STORAGE_KEY = 'calfs-and-cals/active-workout/v1';

export type SetRow = { id: string; reps: string; kg: string; done: boolean };
export type Item =
  | { id: string; kind: 'strength'; name: string; sets: SetRow[] }
  | { id: string; kind: 'cardio'; name: string; km: string; minutes: string; done: boolean };

export type ActiveWorkout = {
  routineId: string;
  routineName: string;
  items: Item[];
  /** Seconds counted before `runningSince`. */
  baseSeconds: number;
  /** When the timer last started counting; null while paused. */
  runningSince: number | null;
  /** Set when the timer stopped because every set was checked off, so unchecking one resumes it. */
  autoStoppedAt: number | null;
  /** When the current rest period ends; null when not resting. */
  restEndsAt: number | null;
};

type Saved = { workout: ActiveWorkout | null; restSeconds: number };

const DEFAULT_REST = 90;

const toText = (n: number | null) => (n === null ? '' : String(n));

/** Turns the routine's plan into editable rows, prefilled with the planned numbers. */
export function itemFromExercise(e: RoutineExercise): Item {
  return e.kind === 'strength'
    ? {
        id: e.id,
        kind: 'strength',
        name: e.exercise,
        sets: Array.from({ length: Math.max(1, e.sets ?? 1) }, () => ({
          id: newId(),
          reps: toText(e.reps),
          kg: toText(e.kg),
          done: false,
        })),
      }
    : { id: e.id, kind: 'cardio', name: e.activity, km: toText(e.km), minutes: toText(e.minutes), done: false };
}

export function countDone(items: Item[]): number {
  return items.reduce(
    (n, item) => n + (item.kind === 'strength' ? item.sets.filter((s) => s.done).length : item.done ? 1 : 0),
    0,
  );
}

export function countTotal(items: Item[]): number {
  return items.reduce((n, item) => n + (item.kind === 'strength' ? item.sets.length : 1), 0);
}

/** Seconds of training time at `now`. */
export function elapsedSeconds(w: ActiveWorkout, now: number): number {
  const running = w.runningSince === null ? 0 : (now - w.runningSince) / 1000;
  return Math.max(0, Math.floor(w.baseSeconds + running));
}

/** Seconds of rest left at `now`, or null when not resting. */
export function restLeft(w: ActiveWorkout, now: number): number | null {
  if (w.restEndsAt === null) return null;
  return Math.max(0, Math.ceil((w.restEndsAt - now) / 1000));
}

/**
 * Stops the timer when every set is checked off and starts it again (from where it stopped)
 * when one is unchecked or added.
 */
export function syncAutoStop(w: ActiveWorkout, now: number): ActiveWorkout {
  const total = countTotal(w.items);
  const allDone = total > 0 && countDone(w.items) === total;
  if (allDone && w.runningSince !== null) {
    return {
      ...w,
      baseSeconds: elapsedSeconds(w, now),
      runningSince: null,
      autoStoppedAt: now,
      restEndsAt: null,
    };
  }
  if (!allDone && w.autoStoppedAt !== null) {
    // Picks the count back up as if it never stopped, so the time in between is counted.
    return { ...w, runningSince: w.autoStoppedAt, autoStoppedAt: null };
  }
  return w;
}

type ActiveWorkoutStore = {
  workout: ActiveWorkout | null;
  /** Preferred rest between sets in seconds; 0 turns the rest timer off. */
  restSeconds: number;
  start: (routine: Routine) => void;
  discard: () => void;
  updateItems: (fn: (items: Item[]) => Item[]) => void;
  pause: () => void;
  resume: () => void;
  /** Sets the counted time without changing whether the timer is running. */
  setElapsed: (seconds: number) => void;
  setRestSeconds: (seconds: number) => void;
  startRest: () => void;
  /** Adds (or with a negative number removes) seconds from the current rest. */
  adjustRest: (by: number) => void;
  skipRest: () => void;
};

const Context = createContext<ActiveWorkoutStore | null>(null);

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const { resetCount } = useStore();
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
        setSaved({ workout: parsed.workout ?? null, restSeconds: parsed.restSeconds ?? DEFAULT_REST });
      })
      .catch(() => setSaved({ workout: null, restSeconds: DEFAULT_REST }));
  }, []);

  useEffect(() => {
    if (saved) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved]);

  // Wiping all data also drops the workout in progress.
  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount !== firstReset.current) setSaved((s) => (s ? { ...s, workout: null } : s));
  }, [resetCount]);

  // Buzzes once when a rest period runs out while the app is open.
  const restEndsAt = saved?.workout?.restEndsAt ?? null;
  useEffect(() => {
    if (restEndsAt === null) return;
    const wait = restEndsAt - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => {
      if (AppState.currentState === 'active') Vibration.vibrate([0, 300, 150, 300]);
    }, wait);
    return () => clearTimeout(timer);
  }, [restEndsAt]);

  if (!saved) return null;

  const updateWorkout = (fn: (w: ActiveWorkout, now: number) => ActiveWorkout | null) =>
    setSaved((s) => (s?.workout ? { ...s, workout: fn(s.workout, Date.now()) } : s));

  const store: ActiveWorkoutStore = {
    workout: saved.workout,
    restSeconds: saved.restSeconds,
    start: (routine) =>
      setSaved((s) =>
        s
          ? {
              ...s,
              workout: {
                routineId: routine.id,
                routineName: routine.name,
                items: routine.exercises.map(itemFromExercise),
                baseSeconds: 0,
                runningSince: Date.now(),
                autoStoppedAt: null,
                restEndsAt: null,
              },
            }
          : s,
      ),
    discard: () => setSaved((s) => (s ? { ...s, workout: null } : s)),
    updateItems: (fn) => updateWorkout((w, now) => syncAutoStop({ ...w, items: fn(w.items) }, now)),
    pause: () =>
      updateWorkout((w, now) =>
        w.runningSince === null
          ? w
          : { ...w, baseSeconds: elapsedSeconds(w, now), runningSince: null, autoStoppedAt: null },
      ),
    resume: () =>
      updateWorkout((w, now) =>
        w.runningSince !== null ? w : { ...w, runningSince: now, autoStoppedAt: null },
      ),
    setElapsed: (seconds) =>
      updateWorkout((w, now) => ({
        ...w,
        baseSeconds: Math.max(0, Math.round(seconds)),
        runningSince: w.runningSince === null ? null : now,
        autoStoppedAt: null,
      })),
    setRestSeconds: (seconds) => setSaved((s) => (s ? { ...s, restSeconds: Math.max(0, seconds) } : s)),
    startRest: () =>
      setSaved((s) =>
        s?.workout && s.restSeconds > 0 && s.workout.runningSince !== null
          ? { ...s, workout: { ...s.workout, restEndsAt: Date.now() + s.restSeconds * 1000 } }
          : s,
      ),
    adjustRest: (by) =>
      updateWorkout((w, now) => {
        if (w.restEndsAt === null) return w;
        const endsAt = w.restEndsAt + by * 1000;
        return { ...w, restEndsAt: endsAt <= now ? null : endsAt };
      }),
    skipRest: () => updateWorkout((w) => ({ ...w, restEndsAt: null })),
  };

  return <Context value={store}>{children}</Context>;
}

export function useActiveWorkout(): ActiveWorkoutStore {
  const store = use(Context);
  if (!store) throw new Error('useActiveWorkout must be used inside ActiveWorkoutProvider');
  return store;
}

/** The current time, refreshed every `ms` while `enabled`. */
export function useNow(enabled = true, ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), ms);
    // Catch up straight away when the app comes back from the background.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled, ms]);
  return now;
}
