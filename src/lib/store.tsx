import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import type { ActivityLevel, Sex } from './body';
import { type DateKey, toKey } from './dates';
import type { Nutrition } from './food-lookup';
import { FOOD_CATEGORIES } from './foods';
import type { Mode } from './mode';
import { EXERCISES, migrateWorkout } from './workouts';

/** Everything lives in one JSON blob in on-device storage. Nothing leaves the phone. */
const STORAGE_KEY = 'calfs-and-cals/v1';

/** Optional detail for a food entry, in grams. Scanned foods have it; quick kcal entries don't. */
export type Macros = { grams?: number; protein?: number; fat?: number; carbs?: number };
export type Food = { id: string; date: DateKey; name: string; kcal: number; at: number } & Macros;

/** One set of a strength exercise. Several sets of the same exercise are separate entries. */
export type StrengthSet = {
  id: string;
  date: DateKey;
  at: number;
  kind: 'strength';
  exercise: string;
  reps: number;
  kg: number;
  /** The workout session this set was logged in, if it came from one. */
  sessionId?: string;
};
/** A cardio session. Distance and time are each optional, but at least one is recorded. */
export type Cardio = {
  id: string;
  date: DateKey;
  at: number;
  kind: 'cardio';
  activity: string;
  minutes: number | null;
  km: number | null;
  sessionId?: string;
};
export type Workout = StrengthSet | Cardio;

/** A strength exercise in a routine with the planned sets, reps and weight. Each number is optional. */
export type RoutineStrength = {
  id: string;
  kind: 'strength';
  exercise: string;
  sets: number | null;
  reps: number | null;
  kg: number | null;
};
/** A cardio activity in a routine with an optional planned distance and time. */
export type RoutineCardio = {
  id: string;
  kind: 'cardio';
  activity: string;
  km: number | null;
  minutes: number | null;
};
export type RoutineExercise = RoutineStrength | RoutineCardio;

/** A set or cardio session as entered, before it gets an id, date and time. */
export type WorkoutEntry =
  | Omit<StrengthSet, 'id' | 'date' | 'at' | 'sessionId'>
  | Omit<Cardio, 'id' | 'date' | 'at' | 'sessionId'>;

/**
 * A finished workout started from a routine. Its sets and cardio are stored in `workouts`
 * with this session's id.
 */
export type Session = {
  id: string;
  /** The day it was finished; always matches `finishedAt`. */
  date: DateKey;
  routineId: string;
  routineName: string;
  /** When the workout was finished. */
  finishedAt: number;
  /** Training time in seconds. */
  seconds: number;
};
/** What can be set when finishing or editing a session. */
export type SessionInput = Pick<Session, 'routineId' | 'routineName' | 'finishedAt' | 'seconds'>;
/** A saved workout plan: a name and an ordered list of exercises. */
export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  /** When the routine was created or last edited; the list shows the newest first. */
  updatedAt: number;
};

/** A food the user chose to keep, with values per 100 g so any portion can be logged later. */
export type SavedFood = Nutrition & {
  id: string;
  name: string;
  category: string | null;
  /** Set when the food came from a barcode scan, so the same barcode is found offline. */
  barcode: string | null;
  at: number;
};
export type Goals = {
  /** Max kcal per day. */
  dailyCalories: number | null;
  /** Training days per week (Mon–Sun). */
  weeklyWorkouts: number | null;
  /** Target body weight in kg. */
  targetWeight: number | null;
};
export type Profile = {
  heightCm: number | null;
  sex: Sex | null;
  age: number | null;
  activity: ActivityLevel | null;
  /** How many weeks the user wants to take to reach the target weight. */
  weeksToGoal: number | null;
  /** The day the timeline was set, so the weeks left can be counted down. */
  targetStart: DateKey | null;
  /** Section to open straight into on launch; null shows the choice screen. */
  startPage: Mode | null;
};
export type Data = {
  profile: Profile;
  foods: Food[];
  workouts: Workout[];
  routines: Routine[];
  sessions: Session[];
  savedFoods: SavedFood[];
  /** Food categories the user added to the built-in list. */
  customCategories: string[];
  /** Strength exercises the user added to the built-in list. */
  customExercises: string[];
  /** Target weight in kg per exercise name. */
  exerciseTargets: Record<string, number>;
  /** Body weight in kg, one value per day. */
  weights: Record<DateKey, number>;
  goals: Goals;
};

const EMPTY: Data = {
  profile: {
    heightCm: null,
    sex: null,
    age: null,
    activity: null,
    weeksToGoal: null,
    targetStart: null,
    startPage: null,
  },
  foods: [],
  workouts: [],
  routines: [],
  sessions: [],
  savedFoods: [],
  customCategories: [],
  customExercises: [],
  exerciseTargets: {},
  weights: {},
  goals: { dailyCalories: null, weeklyWorkouts: null, targetWeight: null },
};

type Store = {
  data: Data;
  /** Bumped when all data is wiped, so screens can reset local input state. */
  resetCount: number;
  addFood: (date: DateKey, kcal: number, name: string, macros?: Macros) => void;
  removeFood: (id: string) => void;
  addSet: (date: DateKey, exercise: string, reps: number, kg: number) => void;
  addCardio: (date: DateKey, activity: string, minutes: number | null, km: number | null) => void;
  removeWorkout: (id: string) => void;
  /** Creates a routine, or replaces the one with the same id, and marks it as just edited. */
  saveRoutine: (routine: { id?: string; name: string; exercises: RoutineExercise[] }) => void;
  removeRoutine: (id: string) => void;
  /** Logs a finished workout: its completed sets and cardio, plus the session itself. */
  finishWorkout: (session: SessionInput, entries: WorkoutEntry[]) => void;
  /** Changes a finished workout and replaces all of its logged sets and cardio. */
  updateSession: (id: string, session: SessionInput, entries: WorkoutEntry[]) => void;
  /** Deletes a finished workout together with everything logged in it. */
  removeSession: (id: string) => void;
  /** Adds a strength exercise to the list; returns false if the name is taken. */
  addExercise: (name: string) => boolean;
  removeExercise: (name: string) => void;
  setExerciseTarget: (exercise: string, kg: number | null) => void;
  /** Adds a food to the saved list, replacing one with the same barcode or name. */
  saveFood: (food: Omit<SavedFood, 'id' | 'at'>) => void;
  updateSavedFood: (id: string, patch: Partial<Omit<SavedFood, 'id' | 'at'>>) => void;
  removeSavedFood: (id: string) => void;
  /** Adds a food category; returns false if the name is taken. */
  addCategory: (name: string) => boolean;
  /** Removes a custom category; foods in it become uncategorised. */
  removeCategory: (name: string) => void;
  setWeight: (date: DateKey, kg: number | null) => void;
  setGoals: (goals: Partial<Goals>) => void;
  setProfile: (profile: Partial<Profile>) => void;
  clearAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toSession(id: string, input: SessionInput): Session {
  return { ...input, id, date: toKey(new Date(input.finishedAt)) };
}

/** The session's entries as stored workouts, dated by when the session finished. */
function toWorkouts(session: Session, entries: WorkoutEntry[]): Workout[] {
  return entries.map((e) => ({
    ...e,
    id: newId(),
    date: session.date,
    at: session.finishedAt,
    sessionId: session.id,
  }));
}

/** Fills in fields added since the data was saved and upgrades old entry shapes. */
function normalize(saved: Partial<Data>): Data {
  return {
    ...EMPTY,
    ...saved,
    workouts: (saved.workouts ?? []).map(migrateWorkout),
    // Routines saved before cardio could be added only held strength exercises.
    routines: (saved.routines ?? []).map((r) => ({
      ...r,
      exercises: r.exercises.map((e) => ({ ...e, kind: e.kind ?? 'strength' }) as RoutineExercise),
    })),
    // The first sessions stored when they started instead of when they finished.
    sessions: (saved.sessions ?? []).map((s) => {
      const old = s as Session & { startedAt?: number };
      return { ...s, finishedAt: s.finishedAt ?? (old.startedAt ?? 0) + s.seconds * 1000 };
    }),
    savedFoods: (saved.savedFoods ?? []).map((f) => ({ ...f, category: f.category ?? null })),
    goals: { ...EMPTY.goals, ...saved.goals },
    profile: { ...EMPTY.profile, ...saved.profile },
  };
}

export function StoreProvider({ children, onReady }: { children: ReactNode; onReady?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setData(normalize(raw ? (JSON.parse(raw) as Partial<Data>) : {})))
      .catch(() => setData(EMPTY))
      .finally(() => onReady?.());
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  if (!data) return null;

  const update = (fn: (d: Data) => Data) => setData((d) => (d ? fn(d) : d));

  const store: Store = {
    data,
    resetCount,
    addFood: (date, kcal, name, macros) =>
      update((d) => ({
        ...d,
        foods: [...d.foods, { ...macros, id: newId(), date, name: name.trim(), kcal, at: Date.now() }],
      })),
    removeFood: (id) => update((d) => ({ ...d, foods: d.foods.filter((f) => f.id !== id) })),
    addSet: (date, exercise, reps, kg) =>
      update((d) => ({
        ...d,
        workouts: [
          ...d.workouts,
          { id: newId(), date, at: Date.now(), kind: 'strength', exercise, reps, kg },
        ],
      })),
    addCardio: (date, activity, minutes, km) =>
      update((d) => ({
        ...d,
        workouts: [
          ...d.workouts,
          { id: newId(), date, at: Date.now(), kind: 'cardio', activity, minutes, km },
        ],
      })),
    removeWorkout: (id) =>
      update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })),
    saveRoutine: ({ id, name, exercises }) => {
      const routine: Routine = { id: id ?? newId(), name: name.trim(), exercises, updatedAt: Date.now() };
      update((d) => ({
        ...d,
        routines: [...d.routines.filter((r) => r.id !== routine.id), routine],
      }));
    },
    removeRoutine: (id) =>
      update((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) })),
    finishWorkout: (session, entries) =>
      update((d) => {
        const saved = toSession(newId(), session);
        return {
          ...d,
          workouts: [...d.workouts, ...toWorkouts(saved, entries)],
          sessions: [...d.sessions, saved],
        };
      }),
    updateSession: (id, session, entries) =>
      update((d) => {
        const saved = toSession(id, session);
        return {
          ...d,
          workouts: [...d.workouts.filter((w) => w.sessionId !== id), ...toWorkouts(saved, entries)],
          sessions: d.sessions.map((s) => (s.id === id ? saved : s)),
        };
      }),
    removeSession: (id) =>
      update((d) => ({
        ...d,
        workouts: d.workouts.filter((w) => w.sessionId !== id),
        sessions: d.sessions.filter((s) => s.id !== id),
      })),
    addExercise: (name) => {
      const trimmed = name.trim();
      if (trimmed === '' || exerciseExists(data, trimmed)) return false;
      update((d) => ({ ...d, customExercises: [...d.customExercises, trimmed] }));
      return true;
    },
    removeExercise: (name) =>
      update((d) => {
        const exerciseTargets = { ...d.exerciseTargets };
        delete exerciseTargets[name];
        return {
          ...d,
          exerciseTargets,
          customExercises: d.customExercises.filter((e) => e !== name),
        };
      }),
    setExerciseTarget: (exercise, kg) =>
      update((d) => {
        const exerciseTargets = { ...d.exerciseTargets };
        if (kg === null) delete exerciseTargets[exercise];
        else exerciseTargets[exercise] = kg;
        return { ...d, exerciseTargets };
      }),
    saveFood: (food) =>
      update((d) => {
        const existing = findSavedFood(d.savedFoods, food);
        const saved: SavedFood = {
          ...food,
          name: food.name.trim(),
          id: existing?.id ?? newId(),
          at: Date.now(),
        };
        return {
          ...d,
          savedFoods: [...d.savedFoods.filter((f) => f.id !== saved.id), saved],
        };
      }),
    updateSavedFood: (id, patch) =>
      update((d) => ({
        ...d,
        savedFoods: d.savedFoods.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      })),
    removeSavedFood: (id) =>
      update((d) => ({ ...d, savedFoods: d.savedFoods.filter((f) => f.id !== id) })),
    addCategory: (name) => {
      const trimmed = name.trim();
      if (trimmed === '' || categoryExists(data, trimmed)) return false;
      update((d) => ({ ...d, customCategories: [...d.customCategories, trimmed] }));
      return true;
    },
    removeCategory: (name) =>
      update((d) => ({
        ...d,
        customCategories: d.customCategories.filter((c) => c !== name),
        savedFoods: d.savedFoods.map((f) => (f.category === name ? { ...f, category: null } : f)),
      })),
    setWeight: (date, kg) =>
      update((d) => {
        const weights = { ...d.weights };
        if (kg === null) delete weights[date];
        else weights[date] = kg;
        return { ...d, weights };
      }),
    setGoals: (goals) => update((d) => ({ ...d, goals: { ...d.goals, ...goals } })),
    setProfile: (profile) => update((d) => ({ ...d, profile: { ...d.profile, ...profile } })),
    clearAll: () => {
      setData(EMPTY);
      setResetCount((n) => n + 1);
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/** Whether a built-in or custom exercise already has this name, ignoring case. */
export function exerciseExists(data: Data, name: string): boolean {
  const key = name.trim().toLowerCase();
  return [...EXERCISES, ...data.customExercises].some((e) => e.toLowerCase() === key);
}

/** Whether a built-in or custom food category already has this name, ignoring case. */
export function categoryExists(data: Data, name: string): boolean {
  const key = name.trim().toLowerCase();
  return [...FOOD_CATEGORIES, ...data.customCategories].some((c) => c.toLowerCase() === key);
}

/** The saved food matching a barcode, or failing that the same name ignoring case. */
export function findSavedFood(
  savedFoods: SavedFood[],
  food: { barcode?: string | null; name?: string },
): SavedFood | undefined {
  if (food.barcode) {
    const byBarcode = savedFoods.find((f) => f.barcode === food.barcode);
    if (byBarcode) return byBarcode;
  }
  const name = food.name?.trim().toLowerCase();
  return name ? savedFoods.find((f) => f.name.toLowerCase() === name) : undefined;
}

/** Parses user-typed positive numbers, accepting a comma as the decimal separator. */
export function parseNumber(text: string): number | null {
  const n = parseAmount(text);
  return n !== null && n > 0 ? n : null;
}

/** Like `parseNumber` but accepts zero, for amounts such as "0 g fat". */
export function parseAmount(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function sumKcal(foods: Food[]): number {
  return foods.reduce((sum, f) => sum + f.kcal, 0);
}

/** Day totals in grams, or null when no entry has macro data. */
export function sumMacros(foods: Food[]): { protein: number; fat: number; carbs: number } | null {
  const tracked = foods.filter(
    (f) => f.protein !== undefined || f.fat !== undefined || f.carbs !== undefined,
  );
  if (tracked.length === 0) return null;
  const total = (key: 'protein' | 'fat' | 'carbs') =>
    Math.round(tracked.reduce((sum, f) => sum + (f[key] ?? 0), 0));
  return { protein: total('protein'), fat: total('fat'), carbs: total('carbs') };
}

/** Most recent recorded weight on or before `date`. */
export function latestWeight(weights: Data['weights'], date: DateKey): number | null {
  const keys = Object.keys(weights)
    .filter((k) => k <= date)
    .sort();
  return keys.length ? weights[keys[keys.length - 1]] : null;
}
