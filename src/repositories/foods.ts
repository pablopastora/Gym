import { and, asc, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';

import { BASE_FOODS, BASE_FOODS_VERSION } from '@/data/foods';
import { appMeta, food, recipeItem, type FoodSource } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { recipeTotals, type OffFood } from '@/domain/nutrition';
import { matchesQuery, normalize } from '@/domain/search';

export type Food = typeof food.$inferSelect;

const META_KEY = 'base_foods_version';

/**
 * Carga o actualiza la lista local de alimentos básicos. Idempotente: añade los que
 * falten y actualiza los valores de los que el usuario no ha editado.
 */
export async function seedBaseFoods(db: AppDb, force = false) {
  const [meta] = await db.select().from(appMeta).where(eq(appMeta.key, META_KEY));
  if (!force && meta && Number(meta.value) >= BASE_FOODS_VERSION) return;
  const existing = await db.select({ id: food.id, baseKey: food.baseKey, edited: food.edited }).from(food).where(isNotNull(food.baseKey));
  const byKey = new Map(existing.map((e) => [e.baseKey!, e]));
  for (const b of BASE_FOODS) {
    const values = {
      baseKey: b.key,
      source: 'base' as FoodSource,
      name: b.name,
      category: b.category,
      tags: b.tags,
      kcal: b.kcal,
      protein: b.protein,
      carbs: b.carbs,
      fat: b.fat,
      fiber: b.fiber,
      unitLabel: b.unitLabel,
      unitG: b.unitG,
      servingG: b.servingG,
    };
    const e = byKey.get(b.key);
    if (!e) await db.insert(food).values(values);
    else if (!e.edited) await db.update(food).set(values).where(eq(food.id, e.id));
  }
  await db
    .insert(appMeta)
    .values({ key: META_KEY, value: String(BASE_FOODS_VERSION) })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: String(BASE_FOODS_VERSION) } });
}

export async function getFood(db: AppDb, id: number) {
  const [f] = await db.select().from(food).where(eq(food.id, id));
  return f ?? null;
}

export async function allFoods(db: AppDb) {
  return db.select().from(food).where(eq(food.archived, false)).orderBy(asc(food.name));
}

/** Búsqueda local (sin tildes, todas las palabras). Primero favoritos y usados recientemente. */
export function searchFoodsLocal(foods: Food[], query: string, limit = 60): Food[] {
  const q = normalize(query.trim());
  const res = foods.filter((f) => !f.archived && matchesQuery(q, f.name, f.brand, f.barcode));
  const score = (f: Food) => (normalize(f.name).startsWith(q) ? 0 : 1) * 10 + (f.isFavorite ? 0 : 2) + (f.lastUsedAt ? 0 : 1);
  return res.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'es')).slice(0, limit);
}

export function recentFoodsQuery(db: AppDb, limit = 30) {
  return db
    .select()
    .from(food)
    .where(and(isNotNull(food.lastUsedAt), eq(food.archived, false)))
    .orderBy(desc(food.lastUsedAt))
    .limit(limit);
}

export function favoriteFoodsQuery(db: AppDb) {
  return db.select().from(food).where(and(eq(food.isFavorite, true), eq(food.archived, false))).orderBy(asc(food.name));
}

export function myFoodsQuery(db: AppDb) {
  return db
    .select()
    .from(food)
    .where(and(inArray(food.source, ['propio', 'receta', 'off']), eq(food.archived, false)))
    .orderBy(desc(food.updatedAt), desc(food.id));
}

export async function setFoodFavorite(db: AppDb, id: number, fav: boolean) {
  await db.update(food).set({ isFavorite: fav }).where(eq(food.id, id));
}

export async function touchFood(db: AppDb, id: number, now = Date.now()) {
  await db.update(food).set({ lastUsedAt: now }).where(eq(food.id, id));
}

export async function foodByBarcode(db: AppDb, code: string) {
  const [f] = await db.select().from(food).where(and(eq(food.barcode, code), eq(food.archived, false))).limit(1);
  return f ?? null;
}

/** Guarda en caché local un producto de Open Food Facts (por código si lo tiene). */
export async function cacheOffFood(db: AppDb, off: OffFood, now = Date.now()): Promise<number> {
  const values = {
    source: 'off' as FoodSource,
    barcode: off.barcode,
    name: off.name,
    brand: off.brand,
    category: 'producto',
    kcal: off.kcal,
    protein: off.protein,
    carbs: off.carbs,
    fat: off.fat,
    fiber: off.fiber,
    salt: off.salt,
    servingG: off.servingG,
    updatedAt: now,
  };
  if (off.barcode) {
    const existing = await foodByBarcode(db, off.barcode);
    if (existing) {
      // Si el usuario lo editó, se respeta su versión.
      if (!existing.edited) await db.update(food).set(values).where(eq(food.id, existing.id));
      return existing.id;
    }
  }
  const [r] = await db.insert(food).values(values).returning({ id: food.id });
  return r.id;
}

export interface FoodInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  unitLabel?: string | null;
  unitG?: number | null;
  servingG?: number | null;
  category?: string;
}

export async function createCustomFood(db: AppDb, input: FoodInput, now = Date.now()) {
  const [r] = await db
    .insert(food)
    .values({
      ...input,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      barcode: input.barcode?.trim() || null,
      source: 'propio',
      category: input.category ?? 'otros',
      updatedAt: now,
    })
    .returning({ id: food.id });
  return r.id;
}

/** Edita un alimento (de cualquier origen). Los de la lista local quedan marcados como editados. */
export async function updateFood(db: AppDb, id: number, input: FoodInput, now = Date.now()) {
  await db
    .update(food)
    .set({ ...input, name: input.name.trim(), brand: input.brand?.trim() || null, barcode: input.barcode?.trim() || null, edited: true, updatedAt: now })
    .where(eq(food.id, id));
}

/** Oculta un alimento (las entradas antiguas del diario conservan sus valores). */
export async function archiveFood(db: AppDb, id: number) {
  await db.update(food).set({ archived: true, isFavorite: false }).where(eq(food.id, id));
}

// ---------- Recetas ----------

export interface RecipeInput {
  name: string;
  servings: number;
  /** Peso final cocinado (opcional). */
  cookedWeightG?: number | null;
  items: { foodId: number; grams: number }[];
}

async function recipeValues(db: AppDb, input: RecipeInput) {
  const ids = input.items.map((i) => i.foodId);
  const foods = ids.length ? await db.select().from(food).where(inArray(food.id, ids)) : [];
  const byId = new Map(foods.map((f) => [f.id, f]));
  const items = input.items.filter((i) => byId.has(i.foodId) && i.grams > 0).map((i) => ({ food: byId.get(i.foodId)!, grams: i.grams }));
  const t = recipeTotals(items, input.servings, input.cookedWeightG);
  return {
    name: input.name.trim(),
    source: 'receta' as FoodSource,
    category: 'receta',
    kcal: t.per100.kcal,
    protein: t.per100.protein,
    carbs: t.per100.carbs,
    fat: t.per100.fat,
    fiber: t.per100.fiber,
    servings: input.servings,
    servingG: Math.round(t.servingG),
    unitLabel: '1 ración',
    unitG: Math.round(t.servingG),
    // Una receta es tan restrictiva como sus ingredientes (vegetariano, sin lactosa…).
    tags: [...new Set(items.flatMap((i) => i.food.tags ?? []))],
  };
}

export async function saveRecipe(db: AppDb, input: RecipeInput, id?: number | null, now = Date.now()) {
  const values = await recipeValues(db, input);
  let rid = id ?? null;
  if (rid) {
    await db.update(food).set({ ...values, updatedAt: now }).where(eq(food.id, rid));
    await db.delete(recipeItem).where(eq(recipeItem.recipeId, rid));
  } else {
    const [r] = await db.insert(food).values({ ...values, updatedAt: now }).returning({ id: food.id });
    rid = r.id;
  }
  const rows = input.items.filter((i) => i.grams > 0).map((i, idx) => ({ recipeId: rid!, foodId: i.foodId, grams: i.grams, sortOrder: idx }));
  if (rows.length) await db.insert(recipeItem).values(rows);
  return rid;
}

export async function recipeItems(db: AppDb, recipeId: number) {
  return db
    .select({ id: recipeItem.id, foodId: recipeItem.foodId, grams: recipeItem.grams, food })
    .from(recipeItem)
    .innerJoin(food, eq(food.id, recipeItem.foodId))
    .where(eq(recipeItem.recipeId, recipeId))
    .orderBy(asc(recipeItem.sortOrder));
}

export function recipesQuery(db: AppDb) {
  return db.select().from(food).where(and(eq(food.source, 'receta'), eq(food.archived, false))).orderBy(asc(food.name));
}

/** Alimentos no archivados que no son recetas (para ingredientes). */
export function ingredientFoodsQuery(db: AppDb) {
  return db.select().from(food).where(and(ne(food.source, 'receta'), eq(food.archived, false))).orderBy(asc(food.name));
}
