import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

import { food, profile, type FoodPref } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { DIET_FLAGS, type PlannerFood } from '@/domain/mealPlanner';

/** Alimentos para el recomendador (incluye preferencias). */
export async function plannerFoods(db: AppDb): Promise<PlannerFood[]> {
  const rows = await db.select().from(food).where(eq(food.archived, false));
  return rows.map((f) => ({ ...f, tags: f.tags ?? [] }));
}

export async function setFoodPref(db: AppDb, id: number, pref: FoodPref | null) {
  await db.update(food).set({ pref }).where(eq(food.id, id));
}

export async function setFoodPantry(db: AppDb, id: number, inPantry: boolean) {
  await db.update(food).set({ inPantry }).where(eq(food.id, id));
}

export async function setDietFlags(db: AppDb, flags: string[]) {
  const valid = flags.filter((f) => DIET_FLAGS.some((d) => d.key === f));
  await db.update(profile).set({ dietFlags: valid }).where(eq(profile.id, 1));
}

/** Nombres de alimentos marcados, para compartir el plan del día. */
export async function markedFoodNames(db: AppDb) {
  const rows = await db
    .select({ name: food.name, pref: food.pref, inPantry: food.inPantry })
    .from(food)
    .where(and(eq(food.archived, false)))
    .orderBy(asc(food.name));
  return {
    likes: rows.filter((r) => r.pref === 'gusta').map((r) => r.name),
    pantry: rows.filter((r) => r.inPantry).map((r) => r.name),
    excluded: rows.filter((r) => r.pref === 'no_gusta' || r.pref === 'alergia').map((r) => r.name),
  };
}

export function markedFoodsQuery(db: AppDb) {
  return db.select().from(food).where(and(eq(food.archived, false), isNotNull(food.pref))).orderBy(asc(food.name));
}

export async function clearPantry(db: AppDb) {
  const rows = await db.select({ id: food.id }).from(food).where(eq(food.inPantry, true));
  if (rows.length) await db.update(food).set({ inPantry: false }).where(inArray(food.id, rows.map((r) => r.id)));
}
