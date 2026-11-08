import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';

import { diaryEntry, type MealKey, type QuantityUnit } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { addDays, startOfWeek } from '@/domain/dates';
import { gramsFor, macrosFor, sumMacros, type Macros } from '@/domain/nutrition';

import { estimatedExpenditureByDay, maybeProposeAdjustment } from './energy';
import { touchFood, type Food } from './foods';

export type DiaryEntry = typeof diaryEntry.$inferSelect;

function entryValues(f: Food, quantity: number, unit: QuantityUnit) {
  const grams = gramsFor(f, quantity, unit);
  if (grams == null) throw new Error('Cantidad no válida para este alimento.');
  const m = macrosFor(f, grams);
  return { foodId: f.id, name: f.brand ? `${f.name} · ${f.brand}` : f.name, quantity, unit, grams: Math.round(grams * 10) / 10, ...m };
}

async function nextOrder(db: AppDb, date: string, meal: MealKey) {
  const [r] = await db
    .select({ n: sql<number>`coalesce(max(${diaryEntry.sortOrder}), -1)` })
    .from(diaryEntry)
    .where(and(eq(diaryEntry.date, date), eq(diaryEntry.meal, meal)));
  return (r?.n ?? -1) + 1;
}

export async function addFoodEntry(db: AppDb, p: { date: string; meal: MealKey; food: Food; quantity: number; unit: QuantityUnit }, now = Date.now()) {
  const [r] = await db
    .insert(diaryEntry)
    .values({ date: p.date, meal: p.meal, ...entryValues(p.food, p.quantity, p.unit), sortOrder: await nextOrder(db, p.date, p.meal) })
    .returning({ id: diaryEntry.id });
  await touchFood(db, p.food.id, now);
  return r.id;
}

export async function updateFoodEntry(db: AppDb, id: number, p: { meal: MealKey; food: Food; quantity: number; unit: QuantityUnit }) {
  await db
    .update(diaryEntry)
    .set({ meal: p.meal, ...entryValues(p.food, p.quantity, p.unit) })
    .where(eq(diaryEntry.id, id));
}

/** «Calorías rápidas»: solo kcal y, opcionalmente, macros. */
export async function addQuickEntry(db: AppDb, p: { date: string; meal: MealKey; name?: string; kcal: number; protein?: number | null; carbs?: number | null; fat?: number | null }) {
  const [r] = await db
    .insert(diaryEntry)
    .values({
      date: p.date,
      meal: p.meal,
      foodId: null,
      name: p.name?.trim() || 'Calorías rápidas',
      kcal: Math.round(p.kcal),
      protein: p.protein ?? 0,
      carbs: p.carbs ?? 0,
      fat: p.fat ?? 0,
      fiber: 0,
      sortOrder: await nextOrder(db, p.date, p.meal),
    })
    .returning({ id: diaryEntry.id });
  return r.id;
}

export async function updateQuickEntry(db: AppDb, id: number, p: { meal: MealKey; name?: string; kcal: number; protein?: number | null; carbs?: number | null; fat?: number | null }) {
  await db
    .update(diaryEntry)
    .set({ meal: p.meal, name: p.name?.trim() || 'Calorías rápidas', kcal: Math.round(p.kcal), protein: p.protein ?? 0, carbs: p.carbs ?? 0, fat: p.fat ?? 0 })
    .where(eq(diaryEntry.id, id));
}

export async function deleteEntry(db: AppDb, id: number) {
  await db.delete(diaryEntry).where(eq(diaryEntry.id, id));
}

export async function getEntry(db: AppDb, id: number) {
  const [e] = await db.select().from(diaryEntry).where(eq(diaryEntry.id, id));
  return e ?? null;
}

export function dayEntriesQuery(db: AppDb, date: string) {
  return db.select().from(diaryEntry).where(eq(diaryEntry.date, date)).orderBy(asc(diaryEntry.sortOrder), asc(diaryEntry.id));
}

/** Copia todas las entradas de un día (o de una comida) a otro día/comida. Devuelve cuántas. */
export async function copyEntries(db: AppDb, p: { fromDate: string; toDate: string; fromMeal?: MealKey; toMeal?: MealKey }) {
  const src = await db
    .select()
    .from(diaryEntry)
    .where(p.fromMeal ? and(eq(diaryEntry.date, p.fromDate), eq(diaryEntry.meal, p.fromMeal)) : eq(diaryEntry.date, p.fromDate))
    .orderBy(asc(diaryEntry.sortOrder), asc(diaryEntry.id));
  for (const e of src) {
    const meal = p.toMeal ?? e.meal;
    const { id: _id, createdAt: _c, ...rest } = e;
    await db.insert(diaryEntry).values({ ...rest, date: p.toDate, meal, sortOrder: await nextOrder(db, p.toDate, meal) });
  }
  return src.length;
}

/** kcal ingeridas por día (solo días con algún registro). */
export async function intakeByDay(db: AppDb, from: string, to: string): Promise<Map<string, Macros>> {
  const rows = await db
    .select({
      date: diaryEntry.date,
      kcal: sql<number>`sum(${diaryEntry.kcal})`,
      protein: sql<number>`sum(${diaryEntry.protein})`,
      carbs: sql<number>`sum(${diaryEntry.carbs})`,
      fat: sql<number>`sum(${diaryEntry.fat})`,
      fiber: sql<number>`sum(${diaryEntry.fiber})`,
    })
    .from(diaryEntry)
    .where(and(gte(diaryEntry.date, from), lte(diaryEntry.date, to)))
    .groupBy(diaryEntry.date);
  return new Map(rows.map((r) => [r.date, sumMacros([r])]));
}

/** Fechas con ingesta registrada (para el calendario). */
export function datesWithIntakeQuery(db: AppDb) {
  return db.selectDistinct({ date: diaryEntry.date }).from(diaryEntry);
}

export interface WeekIntake {
  weekStart: string;
  /** Media diaria de ingesta en los días registrados. */
  avgIntake: number | null;
  /** Media diaria de gasto estimado en esos mismos días. */
  avgExpenditure: number | null;
  loggedDays: number;
}

/** Ingesta frente a gasto por semana (medias diarias de los días registrados). */
export async function weeklyIntakeVsExpenditure(db: AppDb, today: string, weeks = 8): Promise<WeekIntake[]> {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const intake = await intakeByDay(db, first, today);
  const exp = intake.size ? await estimatedExpenditureByDay(db, first, today) : new Map<string, number>();
  const out: WeekIntake[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = addDays(first, 7 * i);
    const days = Array.from({ length: 7 }, (_, d) => addDays(ws, d)).filter((d) => d <= today && intake.has(d));
    const withExp = days.filter((d) => exp.has(d));
    out.push({
      weekStart: ws,
      loggedDays: days.length,
      avgIntake: days.length ? days.reduce((a, d) => a + intake.get(d)!.kcal, 0) / days.length : null,
      avgExpenditure: withExp.length ? withExp.reduce((a, d) => a + exp.get(d)!, 0) / withExp.length : null,
    });
  }
  return out;
}

/** Comidas de días anteriores con entradas (para «copiar una comida de otro día»). */
export async function recentMeals(db: AppDb, before: string, days = 14) {
  const rows = await db
    .select({ date: diaryEntry.date, meal: diaryEntry.meal, kcal: sql<number>`sum(${diaryEntry.kcal})`, n: sql<number>`count(*)` })
    .from(diaryEntry)
    .where(and(gte(diaryEntry.date, addDays(before, -days)), lte(diaryEntry.date, addDays(before, -1))))
    .groupBy(diaryEntry.date, diaryEntry.meal)
    .orderBy(sql`${diaryEntry.date} desc`);
  return rows;
}


/** Revisa (como mucho una vez al día) si hay datos para proponer un ajuste del gasto. */
export async function checkEnergyAdjustment(db: AppDb, today: string) {
  const intake = await intakeByDay(db, addDays(today, -31), addDays(today, -1));
  if (intake.size < 14) return null;
  return maybeProposeAdjustment(db, today, new Map([...intake].map(([d, m]) => [d, m.kcal])));
}
