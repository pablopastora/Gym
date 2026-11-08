import { and, asc, desc, eq, gte, isNotNull, isNull, lte, ne } from 'drizzle-orm';

import { bodyWeight, cardioSession, exercise, profile, workout, workoutExercise, workoutSet } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { addDays, startOfWeek } from '@/domain/dates';
import { estimateCardio, type CardioIntensity } from '@/domain/cardio';
import { parseDecimal } from '@/domain/format';
import { estimateStrengthKcal } from '@/domain/kcal';

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
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    // Los ejercicios de cardio no cuentan como fuerza: se registran como cardio.
    .where(and(eq(workoutExercise.workoutId, workoutId), ne(exercise.category, 'cardio')));
  const est = estimateStrengthKcal({ sets, totalMin: (w.endedAt - w.startedAt) / 60000, bodyKg: await bodyKgAt(db, w.date) });
  await db.update(workout).set({ kcal: est.kcal, met: est.met }).where(eq(workout.id, workoutId));
  return est;
}

/** Velocidad y pendiente escritas en las notas por registros antiguos («5 km/h, 12 %»). */
export function paceFromNotes(notes: string | null | undefined): { speedKmh: number | null; inclinePct: number | null } {
  if (!notes) return { speedKmh: null, inclinePct: null };
  const sp = /(\d+(?:[.,]\d+)?)\s*km\s*\/\s*h/i.exec(notes);
  const inc = /(\d+(?:[.,]\d+)?)\s*%/.exec(notes);
  return { speedKmh: sp ? parseDecimal(sp[1]) : null, inclinePct: inc ? parseDecimal(inc[1]) : null };
}

/** Calcula y guarda las kcal de un cardio (ACSM o MET) con el peso más reciente a esa fecha. */
export async function computeCardioKcal(db: AppDb, cardioId: number) {
  const [c] = await db.select().from(cardioSession).where(eq(cardioSession.id, cardioId));
  if (!c) return null;
  let speedKmh = c.speedKmh;
  let inclinePct = c.inclinePct;
  if (speedKmh == null && c.distanceKm && c.durationMin > 0) speedKmh = c.distanceKm / (c.durationMin / 60);
  if (c.kcalMethod == null) {
    // Registro antiguo: aprovechar lo que se apuntó en las notas.
    const fromNotes = paceFromNotes(c.notes);
    speedKmh ??= fromNotes.speedKmh;
    inclinePct ??= fromNotes.inclinePct;
  }
  const est = estimateCardio({
    type: c.type,
    durationMin: c.durationMin,
    bodyKg: await bodyKgAt(db, c.date),
    speedKmh,
    inclinePct,
    intensity: (c.intensity as CardioIntensity | null) ?? null,
  });
  await db
    .update(cardioSession)
    .set({ kcal: est.kcal, met: est.met, kcalMethod: est.method, speedKmh: speedKmh ?? null, inclinePct: inclinePct ?? null })
    .where(eq(cardioSession.id, cardioId));
  return est;
}

/** Calcula las kcal de entrenos y cardio antiguos que no las tengan (o que usen la fórmula antigua). */
export async function backfillKcal(db: AppDb) {
  const ws = await db.select({ id: workout.id }).from(workout).where(and(isNotNull(workout.endedAt), isNull(workout.kcal)));
  for (const w of ws) await computeWorkoutKcal(db, w.id);
  // Entrenos con ejercicios de cardio registrados como series: sus kcal de fuerza ya no los incluyen.
  const withCardio = await db
    .selectDistinct({ id: workoutExercise.workoutId })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(exercise.category, 'cardio'), isNotNull(workout.endedAt)));
  for (const w of withCardio) await computeWorkoutKcal(db, w.id);
  // Sin kcal o calculadas con la fórmula antigua (antes de ACSM/MET por intensidad).
  const cs = await db.select({ id: cardioSession.id }).from(cardioSession).where(isNull(cardioSession.kcalMethod));
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

export interface DayActivity {
  date: string;
  strengthKcal: number;
  /** MET medio de la fuerza (ponderado por kcal), para estimar los minutos. */
  strengthMet: number | null;
  cardioKcal: number;
  cardioMin: number;
  /** Lista de [kcal, MET] de cada actividad (para el gasto neto). */
  items: { kcal: number; met: number | null; kind: 'fuerza' | 'cardio' }[];
}

/** Kcal de fuerza y cardio por día entre `from` y `to` (incluidos). */
export async function activityByDay(db: AppDb, from: string, to: string): Promise<Map<string, DayActivity>> {
  const ws = await db
    .select({ date: workout.date, kcal: workout.kcal, met: workout.met })
    .from(workout)
    .where(and(isNotNull(workout.endedAt), gte(workout.date, from), lte(workout.date, to)));
  const cs = await db
    .select({ date: cardioSession.date, kcal: cardioSession.kcal, met: cardioSession.met, min: cardioSession.durationMin })
    .from(cardioSession)
    .where(and(gte(cardioSession.date, from), lte(cardioSession.date, to)));
  const out = new Map<string, DayActivity>();
  const get = (date: string) => {
    let d = out.get(date);
    if (!d) {
      d = { date, strengthKcal: 0, strengthMet: null, cardioKcal: 0, cardioMin: 0, items: [] };
      out.set(date, d);
    }
    return d;
  };
  for (const w of ws) {
    if (!w.kcal) continue;
    const d = get(w.date);
    d.strengthMet = d.strengthKcal + w.kcal > 0 ? ((d.strengthMet ?? 0) * d.strengthKcal + (w.met ?? 0) * w.kcal) / (d.strengthKcal + w.kcal) : null;
    d.strengthKcal += w.kcal;
    d.items.push({ kcal: w.kcal, met: w.met, kind: 'fuerza' });
  }
  for (const c of cs) {
    const d = get(c.date);
    d.cardioKcal += c.kcal ?? 0;
    d.cardioMin += c.min;
    if (c.kcal) d.items.push({ kcal: c.kcal, met: c.met, kind: 'cardio' });
  }
  return out;
}
