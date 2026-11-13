import type { Nutrition } from './food-lookup';
import type { Macros } from './store';

/** Categories offered for saved foods out of the box. The user can add their own. */
export const FOOD_CATEGORIES = [
  'Fruit',
  'Vegetables',
  'Meat & fish',
  'Dairy & eggs',
  'Bread & grains',
  'Snacks & sweets',
  'Drinks',
  'Meals',
  'Supplements',
];

/** "150 g · P 12 · F 5 · C 30" for entries that carry macro data. */
export function macroLine(m: Macros): string | undefined {
  const parts = [
    m.grams !== undefined ? `${m.grams} g` : null,
    m.protein !== undefined ? `P ${m.protein}` : null,
    m.fat !== undefined ? `F ${m.fat}` : null,
    m.carbs !== undefined ? `C ${m.carbs}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/** "380 kcal · Protein 12 g · Fat 5 g · Carbs 60 g" per 100 g; unknown macros are left out. */
export function per100Line(n: Nutrition): string {
  const parts = [
    `${Math.round(n.kcal)} kcal`,
    n.protein !== null ? `Protein ${n.protein} g` : null,
    n.fat !== null ? `Fat ${n.fat} g` : null,
    n.carbs !== null ? `Carbs ${n.carbs} g` : null,
  ].filter(Boolean);
  return `Per 100 g: ${parts.join(' · ')}`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Converts the values of one portion into values per 100 g for saving. */
export function per100(portion: { kcal: number } & Macros, grams: number): Nutrition {
  const scale = (value: number | undefined) =>
    value === undefined ? null : round1((value / grams) * 100);
  return {
    kcal: Math.round((portion.kcal / grams) * 100),
    protein: scale(portion.protein),
    fat: scale(portion.fat),
    carbs: scale(portion.carbs),
  };
}
