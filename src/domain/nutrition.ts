/** Tipos y cálculos de nutrición (alimentos, raciones, macros). */

export type FoodCategory =
  | 'carne'
  | 'pescado'
  | 'marisco'
  | 'huevo'
  | 'lacteo'
  | 'legumbre'
  | 'cereal'
  | 'tuberculo'
  | 'fruta'
  | 'verdura'
  | 'grasa'
  | 'frutos_secos'
  | 'bebida'
  | 'otros'
  | 'receta'
  | 'producto';

/** Alimento de la lista local inicial (valores por 100 g). */
export interface BaseFood {
  key: string;
  name: string;
  /** Número del alimento en USDA SR28 (fuente de los valores). */
  ndb: string;
  category: FoodCategory;
  tags: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  unitLabel: string | null;
  unitG: number | null;
  servingG: number;
}

export type MealKey = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'snacks';
export type QuantityUnit = 'g' | 'unidad' | 'racion';

export const MEALS: { key: MealKey; label: string; icon: string }[] = [
  { key: 'desayuno', label: 'Desayuno', icon: 'coffee-outline' },
  { key: 'comida', label: 'Comida', icon: 'silverware-fork-knife' },
  { key: 'merienda', label: 'Merienda', icon: 'food-apple-outline' },
  { key: 'cena', label: 'Cena', icon: 'weather-night' },
  { key: 'snacks', label: 'Snacks', icon: 'cookie-outline' },
];
export const MEAL_LABEL: Record<MealKey, string> = Object.fromEntries(MEALS.map((m) => [m.key, m.label])) as Record<MealKey, string>;

/** Comida sugerida según la hora. */
export function mealForHour(h: number): MealKey {
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 19) return 'merienda';
  return 'cena';
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/** Valores por 100 g de un alimento. */
export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
}

export interface Portionable extends Per100 {
  unitG?: number | null;
  servingG?: number | null;
}

/** Gramos de una cantidad: en gramos, unidades («1 huevo») o raciones. */
export function gramsFor(food: Portionable, quantity: number, unit: QuantityUnit): number | null {
  if (!(quantity > 0)) return null;
  if (unit === 'g') return quantity;
  if (unit === 'unidad') return food.unitG ? quantity * food.unitG : null;
  return food.servingG ? quantity * food.servingG : null;
}

/** Unidades disponibles para un alimento. */
export function unitsFor(food: Portionable & { unitLabel?: string | null }): { value: QuantityUnit; label: string }[] {
  const out: { value: QuantityUnit; label: string }[] = [{ value: 'g', label: 'Gramos' }];
  if (food.unitG) out.push({ value: 'unidad', label: food.unitLabel ? food.unitLabel.replace(/^1\s+/, '') : 'Unidad' });
  if (food.servingG) out.push({ value: 'racion', label: `Ración (${Math.round(food.servingG)} g)` });
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function macrosFor(food: Per100, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcal * f),
    protein: r1(food.protein * f),
    carbs: r1(food.carbs * f),
    fat: r1(food.fat * f),
    fiber: r1((food.fiber ?? 0) * f),
  };
}

export function sumMacros(items: Partial<Macros>[]): Macros {
  const s = { ...ZERO_MACROS };
  for (const i of items) {
    s.kcal += i.kcal ?? 0;
    s.protein += i.protein ?? 0;
    s.carbs += i.carbs ?? 0;
    s.fat += i.fat ?? 0;
    s.fiber += i.fiber ?? 0;
  }
  return { kcal: Math.round(s.kcal), protein: r1(s.protein), carbs: r1(s.carbs), fat: r1(s.fat), fiber: r1(s.fiber) };
}

export interface RecipeTotals {
  totalG: number;
  total: Macros;
  per100: Macros;
  servingG: number;
  perServing: Macros;
}

/**
 * Receta = suma de ingredientes. Por 100 g se calcula sobre el peso total de los
 * ingredientes (o el peso final cocinado si se indica); ración = total / raciones.
 */
export function recipeTotals(items: { food: Per100; grams: number }[], servings: number, cookedWeightG?: number | null): RecipeTotals {
  const total = sumMacros(items.map((i) => macrosFor(i.food, i.grams)));
  const rawG = items.reduce((a, i) => a + i.grams, 0);
  const totalG = cookedWeightG && cookedWeightG > 0 ? cookedWeightG : rawG;
  const k = totalG > 0 ? 100 / totalG : 0;
  const per100 = { kcal: Math.round(total.kcal * k), protein: r1(total.protein * k), carbs: r1(total.carbs * k), fat: r1(total.fat * k), fiber: r1(total.fiber * k) };
  const sv = Math.max(1, servings);
  return {
    totalG,
    total,
    per100,
    servingG: totalG / sv,
    perServing: { kcal: Math.round(total.kcal / sv), protein: r1(total.protein / sv), carbs: r1(total.carbs / sv), fat: r1(total.fat / sv), fiber: r1(total.fiber / sv) },
  };
}

/** Validación de un alimento propio (por 100 g). */
export function validateFood(f: { name: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }): string | null {
  if (!f.name.trim()) return 'Ponle un nombre.';
  for (const [k, v, max] of [
    ['kcal', f.kcal, 950],
    ['proteína', f.protein, 100],
    ['hidratos', f.carbs, 100],
    ['grasas', f.fat, 100],
  ] as const) {
    if (v == null || v < 0 || v > max) return `Revisa ${k} (por 100 g).`;
  }
  if ((f.protein ?? 0) + (f.carbs ?? 0) + (f.fat ?? 0) > 105) return 'Proteína + hidratos + grasas no pueden pasar de 100 g por 100 g.';
  return null;
}

// ---------- Open Food Facts ----------

export interface OffFood {
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  salt: number | null;
  servingG: number | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Convierte un producto de la API de Open Food Facts a valores por 100 g.
 * Descarta productos sin nombre o sin kcal por 100 g. En la UE los hidratos ya van sin fibra.
 */
export function parseOffProduct(p: unknown): OffFood | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const n = (o.nutriments ?? {}) as Record<string, unknown>;
  const name = String(o.product_name_es || o.product_name || o.generic_name_es || o.generic_name || '').trim();
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n.energy_100g);
    if (kj != null) kcal = kj / 4.184;
  }
  if (!name || kcal == null || kcal < 0 || kcal > 950) return null;
  const brand = String(o.brands ?? '').split(',')[0].trim() || null;
  const serving = num(o.serving_quantity);
  return {
    barcode: o.code ? String(o.code) : null,
    name,
    brand,
    kcal: Math.round(kcal),
    protein: r1(num(n.proteins_100g) ?? 0),
    carbs: r1(num(n.carbohydrates_100g) ?? 0),
    fat: r1(num(n.fat_100g) ?? 0),
    fiber: num(n.fiber_100g) != null ? r1(num(n.fiber_100g)!) : null,
    salt: num(n.salt_100g) != null ? Math.round(num(n.salt_100g)! * 100) / 100 : null,
    servingG: serving && serving > 0 && serving < 2000 ? serving : null,
  };
}

/** Código de barras EAN/UPC con dígito de control correcto. */
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((a, d, i) => a + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export const FOOD_SOURCES_NOTE =
  'Alimentos básicos: valores por 100 g de la USDA National Nutrient Database for Standard Reference (SR28, dominio público), con nombres en español propios. ' +
  'Productos envasados: Open Food Facts (openfoodfacts.org), datos bajo licencia Open Database License (ODbL). ' +
  'Los valores son orientativos y pueden variar según la marca o la preparación.';
