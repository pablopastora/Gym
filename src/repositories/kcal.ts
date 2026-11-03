import { and, asc, desc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';

import { bodyWeight, cardioSession, profile, workout, workoutExercise, workoutSet } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { addDays, startOfWeek } from '@/domain/dates';
import { estimateCardioKcal, estimateStrengthKcal } from '@/domain/kcal';

/** Peso más reciente registrado hasta `date` (si no hay, el último; si no, el del perfil). */
export async function bodyKgAt(db: AppDb, date: string): Promise<number> {
  const [before] = await db.select({ kg: bodyWeight.weightKg }).from(bodyWeight).where(lte(bodyWeight.date, date)).orderBy(desc(bodyWeight.date)).limit(1);
  if (before) return before.kg;
  const [any] = await db.select({ kg: bodyWeight.weightKg }).from(bodyWeight).orderBy(asc(bodyWeight.date)).limit(1);
  if (any) return any.kg;
  const [p] = await db.select({ kg: profile.startWeightKg }).from(profile).limit(1);
  return p?.kg ?? 80;
}

/** Calcula y guarda las kcal de un entreno terminado. */
export async function computeWorkoutKcal(db: AppDb, workoutId: number) {
  const [w] = await db.select().from(workout).where(eq(workout.id, workoutId));
  if (!w?.endedAt) return null;
  const sets = await db
    .select({ setType: workoutSet.setType, completed: workoutSet.completed, weightKg: workoutSet.weightKg, reps: workoutSet.reps, rir: workoutSet.rir, rpe: workoutSet.rpe })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .where(eq(workoutExercise.workoutId, workoutId));
  const est = estimateStrengthKcal({ sets, totalMin: (w.endedAt - w.startedAt) / 60000, bodyKg: await bodyKgAt(db, w.date) });
  await db.update(workout).set({ kcal: est.kcal, met: est.met }).where(eq(workout.id, workoutId));
  return est;
}

export async function computeCardioKcal(db: AppDb, cardioId: number) {
  const [c] = await db.select().from(cardioSession).where(eq(cardioSession.id, cardioId));
  if (!c) return null;
  const est = estimateCardioKcal({ type: c.type, durationMin: c.durationMin, distanceKm: c.distanceKm, bodyKg: await bodyKgAt(db, c.date) });
  await db.update(cardioSession).set({ kcal: est.kcal }).where(eq(cardioSession.id, cardioId));
  return est;
}

/** Calcula las kcal de entrenos y cardio antiguos que no las tengan (una vez). */
export async function backfillKcal(db: AppDb) {
  const ws = await db.select({ id: workout.id }).from(workout).where(and(isNotNull(workout.endedAt), isNull(workout.kcal)));
  for (const w of ws) await computeWorkoutKcal(db, w.id);
  const cs = await db.select({ id: cardioSession.id }).from(cardioSession).where(isNull(cardioSession.kcal));
  for (const c of cs) await computeCardioKcal(db, c.id);
}

export interface WeekKcal {
  weekStart: string;
  strength: number;
  cardio: number;
  total: number;
}

/** Kcal por semana (lunes-domingo) de las últimas `weeks` semanas, incluida la actual. */
export async function weeklyKcal(db: AppDb, today: string, weeks = 8): Promise<WeekKcal[]> {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const ws = await db.select({ date: workout.date, kcal: workout.kcal }).from(workout).where(and(isNotNull(workout.endedAt), gte(workout.date, first)));
  const cs = await db.select({ date: cardioSession.date, kcal: cardioSession.kcal }).from(cardioSession).where(gte(cardioSession.date, first));
  const out: WeekKcal[] = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(first, 7 * i), strength: 0, cardio: 0, total: 0 }));
  const idx = (d: string) => out.findIndex((w) => w.weekStart === startOfWeek(d));
  for (const w of ws) {
    const i = idx(w.date);
    if (i >= 0) out[i].strength += w.kcal ?? 0;
  }
  for (const c of cs) {
    const i = idx(c.date);
    if (i >= 0) out[i].cardio += c.kcal ?? 0;
  }
  for (const w of out) w.total = w.strength + w.cardio;
  return out;
}
