import { and, asc, desc, eq, gte } from 'drizzle-orm';

import { bodyWeight, energyAdjustment, profile, type Profile } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { addDays } from '@/domain/dates';
import {
  ACTIVITY_FACTORS,
  adaptiveSuggestion,
  bmrMifflin,
  calorieTarget,
  dailyExpenditure,
  defaultRate,
  macroTargets,
  missingForBmr,
  netExerciseKcal,
  type AdaptiveDay,
  type CalorieTarget,
  type DayExpenditure,
  type MacroTargets,
} from '@/domain/energy';
import { evaluateGoal } from '@/domain/goals';

import { activityByDay, bodyKgAt } from './kcal';

export interface EnergyStatus {
  profile: Profile;
  weightKg: number;
  /** Datos del perfil que faltan para calcular (no se inventan). */
  missing: ('edad' | 'sexo')[];
  bmr: number | null;
  factor: number;
  today: DayExpenditure | null;
  target: CalorieTarget | null;
  macros: MacroTargets | null;
  rateKgWeek: number;
  rateIsAuto: boolean;
}

/** Días que se promedian para el ejercicio de un «día medio». */
export const EXERCISE_AVG_DAYS = 14;

/** Gasto de hoy, objetivo calórico y macros según el perfil, el último peso y la actividad registrada. */
export async function energyStatus(db: AppDb, today: string): Promise<EnergyStatus> {
  const [p] = await db.select().from(profile).where(eq(profile.id, 1));
  const weightKg = await bodyKgAt(db, today);
  const missing = missingForBmr({ age: p.age, sex: p.sex });
  const goal = evaluateGoal({ currentKg: weightKg, goalKg: p.goalWeightKg, goalDate: p.goalDate, today });
  const rateKgWeek = p.targetRateKgWeek ?? defaultRate(goal.requiredKgPerWeek);
  const factor = ACTIVITY_FACTORS[p.activityLevel] ?? ACTIVITY_FACTORS.ligero;
  if (missing.length) {
    return { profile: p, weightKg, missing, bmr: null, factor, today: null, target: null, macros: null, rateKgWeek, rateIsAuto: p.targetRateKgWeek == null };
  }
  const bmr = bmrMifflin({ sex: p.sex!, weightKg, heightCm: p.heightCm, age: p.age! });
  const from = addDays(today, -EXERCISE_AVG_DAYS);
  const acts = await activityByDay(db, from, today);
  const items = (date: string) => (acts.get(date)?.items ?? []).map((i) => ({ kcal: i.kcal, met: i.met }));
  const todayExp = dailyExpenditure({ bmr, factor, weightKg, items: items(today), adjust: p.tdeeAdjustKcal });
  // Ejercicio neto medio de los 14 días anteriores (los días sin actividad cuentan como 0).
  let netSum = 0;
  for (let i = 1; i <= EXERCISE_AVG_DAYS; i++) netSum += netExerciseKcal(items(addDays(today, -i)), (bmr * factor) / 1440, weightKg);
  const expectedTdee = bmr * factor + netSum / EXERCISE_AVG_DAYS + p.tdeeAdjustKcal;
  const target = calorieTarget({ expectedTdee, bmr, rateKgWeek, manualKcal: p.kcalTargetManual });
  const macros = macroTargets({ kcal: target.targetKcal, weightKg, proteinGPerKg: p.proteinGPerKg, fatGPerKg: p.fatGPerKg });
  return { profile: p, weightKg, missing, bmr, factor, today: todayExp, target, macros, rateKgWeek, rateIsAuto: p.targetRateKgWeek == null };
}

/** Gasto estimado por día (sin recalibración), para comparar con la ingesta. */
export async function estimatedExpenditureByDay(db: AppDb, from: string, to: string): Promise<Map<string, number>> {
  const [p] = await db.select().from(profile).where(eq(profile.id, 1));
  const out = new Map<string, number>();
  if (missingForBmr({ age: p.age, sex: p.sex }).length) return out;
  const factor = ACTIVITY_FACTORS[p.activityLevel] ?? ACTIVITY_FACTORS.ligero;
  const acts = await activityByDay(db, from, to);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const kg = await bodyKgAt(db, d);
    const bmr = bmrMifflin({ sex: p.sex!, weightKg: kg, heightCm: p.heightCm, age: p.age! });
    const items = (acts.get(d)?.items ?? []).map((i) => ({ kcal: i.kcal, met: i.met }));
    out.set(d, dailyExpenditure({ bmr, factor, weightKg: kg, items }).total);
  }
  return out;
}

// ---------- Ajustes sugeridos ----------

export function pendingAdjustmentQuery(db: AppDb) {
  return db.select().from(energyAdjustment).where(eq(energyAdjustment.status, 'pendiente')).orderBy(desc(energyAdjustment.id)).limit(1);
}

/** Días sin volver a proponer un ajuste tras decidir uno. */
export const ADJUSTMENT_COOLDOWN_DAYS = 14;

/**
 * Propone (sin aplicar) un ajuste del gasto si hay datos suficientes y no hay otro
 * pendiente ni decidido hace menos de 14 días. `intakeByDate`: kcal registradas por día.
 */
export async function maybeProposeAdjustment(db: AppDb, today: string, intakeByDate: Map<string, number>) {
  const [pending] = await pendingAdjustmentQuery(db);
  if (pending) return null;
  const [last] = await db.select().from(energyAdjustment).orderBy(desc(energyAdjustment.id)).limit(1);
  if (last && last.createdDate > addDays(today, -ADJUSTMENT_COOLDOWN_DAYS)) return null;
  const from = addDays(today, -30);
  const est = await estimatedExpenditureByDay(db, from, addDays(today, -1));
  if (!est.size) return null;
  // Se compara contra el gasto ya recalibrado: el ajuste propuesto se suma al actual.
  const [p] = await db.select({ adj: profile.tdeeAdjustKcal }).from(profile).where(eq(profile.id, 1));
  const adj = p?.adj ?? 0;
  const days: AdaptiveDay[] = [...est.entries()].map(([date, kcal]) => ({ date, estimatedKcal: kcal + adj, intakeKcal: intakeByDate.get(date) ?? null }));
  const weights = await db.select({ date: bodyWeight.date, weightKg: bodyWeight.weightKg }).from(bodyWeight).where(gte(bodyWeight.date, from)).orderBy(asc(bodyWeight.date));
  const s = adaptiveSuggestion({ today, days, weights });
  if (!s) return null;
  const [row] = await db.insert(energyAdjustment).values({ createdDate: today, ...s }).returning();
  return row;
}

export async function decideAdjustment(db: AppDb, id: number, accept: boolean, now = Date.now()) {
  const [a] = await db.select().from(energyAdjustment).where(and(eq(energyAdjustment.id, id), eq(energyAdjustment.status, 'pendiente')));
  if (!a) return;
  if (accept) {
    const [p] = await db.select({ adj: profile.tdeeAdjustKcal }).from(profile).where(eq(profile.id, 1));
    await db.update(profile).set({ tdeeAdjustKcal: (p?.adj ?? 0) + a.deltaKcal, updatedAt: now }).where(eq(profile.id, 1));
  }
  await db.update(energyAdjustment).set({ status: accept ? 'aceptado' : 'rechazado', decidedAt: now }).where(eq(energyAdjustment.id, id));
}

export function adjustmentHistoryQuery(db: AppDb) {
  return db.select().from(energyAdjustment).orderBy(desc(energyAdjustment.id)).limit(20);
}
