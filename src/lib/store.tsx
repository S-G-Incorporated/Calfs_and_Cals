import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import type { DateKey } from './dates';

/** Everything lives in one JSON blob in on-device storage. Nothing leaves the phone. */
const STORAGE_KEY = 'calfs-and-cals/v1';

/** Optional detail for a food entry, in grams. Scanned foods have it; quick kcal entries don't. */
export type Macros = { grams?: number; protein?: number; fat?: number; carbs?: number };
export type Food = { id: string; date: DateKey; name: string; kcal: number; at: number } & Macros;
export type Workout = { id: string; date: DateKey; type: string; minutes: number; at: number };
export type Goals = {
  /** Max kcal per day. */
  dailyCalories: number | null;
  /** Workouts per week (Mon–Sun). */
  weeklyWorkouts: number | null;
  /** Target body weight in kg. */
  targetWeight: number | null;
};
export type Data = {
  foods: Food[];
  workouts: Workout[];
  /** Body weight in kg, one value per day. */
  weights: Record<DateKey, number>;
  goals: Goals;
};

const EMPTY: Data = {
  foods: [],
  workouts: [],
  weights: {},
  goals: { dailyCalories: null, weeklyWorkouts: null, targetWeight: null },
};

type Store = {
  data: Data;
  /** Bumped when all data is wiped, so screens can reset local input state. */
  resetCount: number;
  addFood: (date: DateKey, kcal: number, name: string, macros?: Macros) => void;
  removeFood: (id: string) => void;
  addWorkout: (date: DateKey, type: string, minutes: number) => void;
  removeWorkout: (id: string) => void;
  setWeight: (date: DateKey, kg: number | null) => void;
  setGoals: (goals: Partial<Goals>) => void;
  clearAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function StoreProvider({ children, onReady }: { children: ReactNode; onReady?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Partial<Data>) : {};
        setData({ ...EMPTY, ...saved, goals: { ...EMPTY.goals, ...saved.goals } });
      })
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
    addWorkout: (date, type, minutes) =>
      update((d) => ({
        ...d,
        workouts: [...d.workouts, { id: newId(), date, type, minutes, at: Date.now() }],
      })),
    removeWorkout: (id) =>
      update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })),
    setWeight: (date, kg) =>
      update((d) => {
        const weights = { ...d.weights };
        if (kg === null) delete weights[date];
        else weights[date] = kg;
        return { ...d, weights };
      }),
    setGoals: (goals) => update((d) => ({ ...d, goals: { ...d.goals, ...goals } })),
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

/** Parses user-typed numbers, accepting a comma as the decimal separator. */
export function parseNumber(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
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
