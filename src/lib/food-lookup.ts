import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Macros } from './store';

/**
 * Open Food Facts asks every app to identify itself. Only the app's slug, version and
 * platform are sent; nothing about the user or device.
 */
const USER_AGENT = `${Constants.expoConfig?.slug ?? 'calfs-and-cals'}/${
  Constants.expoConfig?.version ?? '0.0.0'
} (${Platform.OS})`;

/** Nutrition values per 100 g, as printed on the packaging. Null when unknown. */
export type Nutrition = {
  kcal: number;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

export type Product = Nutrition & { barcode: string; name: string };

export type LookupResult =
  | { status: 'found'; product: Product }
  /** The barcode is unknown, or the product has no calorie data. */
  | { status: 'missing' }
  | { status: 'error' };

const KJ_PER_KCAL = 4.184;

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Looks a barcode up in Open Food Facts, a free and open food database.
 * Only the barcode number is sent; no account or API key is needed.
 */
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<LookupResult> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
    '?fields=product_name,brands,nutriments';
  try {
    const response = await fetch(url, { signal, headers: { 'User-Agent': USER_AGENT } });
    // Unknown barcodes come back as 404 with a JSON body, so only bail on server trouble.
    if (!response.ok && response.status !== 404) return { status: 'error' };
    const json = (await response.json()) as {
      status?: number;
      product?: { product_name?: string; brands?: string; nutriments?: Record<string, unknown> };
    };
    if (json.status !== 1 || !json.product) return { status: 'missing' };

    const n = json.product.nutriments ?? {};
    const kj = num(n['energy_100g']);
    const kcal = num(n['energy-kcal_100g']) ?? (kj === null ? null : kj / KJ_PER_KCAL);
    if (kcal === null) return { status: 'missing' };

    const brand = json.product.brands?.split(',')[0]?.trim();
    const name = [brand, json.product.product_name?.trim()].filter(Boolean).join(' ');
    return {
      status: 'found',
      product: {
        barcode,
        name: name || `Barcode ${barcode}`,
        kcal,
        protein: num(n['proteins_100g']),
        fat: num(n['fat_100g']),
        carbs: num(n['carbohydrates_100g']),
      },
    };
  } catch {
    return { status: 'error' };
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Scales per-100 g values to the amount eaten. */
export function portion(food: Nutrition, grams: number): { kcal: number } & Macros {
  const scale = (per100: number | null) => (per100 === null ? undefined : round1((per100 * grams) / 100));
  return {
    kcal: Math.round((food.kcal * grams) / 100),
    grams,
    protein: scale(food.protein),
    fat: scale(food.fat),
    carbs: scale(food.carbs),
  };
}
