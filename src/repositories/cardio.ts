import { and, desc, eq, isNotNull } from 'drizzle-orm';

import { cardioSession, exercise, workout, workoutExercise, workoutSet } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { cardioTypeForExercise, type CardioIntensity } from '@/domain/cardio';

import { computeCardioKcal, computeWorkoutKcal } from './kcal';

export { CARDIO_TYPES } from '@/domain/cardio';

export interface CardioInput {
  date: string;
  type: string;
  durationMin: number;
  steps?: number | null;
  distanceKm?: number | null;
  speedKmh?: number | null;
  inclinePct?: number | null;
  intensity?: CardioIntensity | null;
  notes?: string | null;
  workoutId?: number | null;
}

function values(input: CardioInput) {
  return {
    date: input.date,
    type: input.type,
    durationMin: input.durationMin,
    steps: input.steps ?? null,
    distanceKm: input.distanceKm ?? null,
    speedKmh: input.speedKmh ?? null,
    inclinePct: input.inclinePct ?? null,
    intensity: input.intensity ?? null,
    notes: input.notes?.trim() || null,
  };
}

/** Guarda el cardio, calcula sus kcal y las devuelve. */
export async function addCardio(db: AppDb, input: CardioInput) {
  const [r] = await db
    .insert(cardioSession)
    .values({ ...values(input), workoutId: input.workoutId ?? null })
    .returning({ id: cardioSession.id });
  const est = await computeCardioKcal(db, r.id);
  return { id: r.id, kcal: est?.kcal ?? null, estimate: est };
}

export async function updateCardio(db: AppDb, id: number, input: CardioInput) {
  await db.update(cardioSession).set(values(input)).where(eq(cardioSession.id, id));
  const est = await computeCardioKcal(db, id);
  return { id, kcal: est?.kcal ?? null, estimate: est };
}

export async function getCardio(db: AppDb, id: number) {
  const [c] = await db.select().from(cardioSession).where(eq(cardioSession.id, id));
  return c ?? null;
}

export async function deleteCardio(db: AppDb, id: number) {
  await db.delete(cardioSession).where(eq(cardioSession.id, id));
}

export function recentCardioQuery(db: AppDb, limit = 20) {
  return db.select().from(cardioSession).orderBy(desc(cardioSession.date), desc(cardioSession.id)).limit(limit);
}

/**
 * Convierte en cardio un ejercicio de cardio que se registró como series de fuerza
 * dentro de un entreno: guarda el cardio vinculado al entreno, quita el ejercicio
 * y recalcula las kcal de fuerza del entreno.
 */
export async function convertExerciseToCardio(db: AppDb, workoutExerciseId: number, input: CardioInput) {
  const [we] = await db.select({ workoutId: workoutExercise.workoutId }).from(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId));
  const res = await addCardio(db, { ...input, workoutId: we?.workoutId ?? input.workoutId ?? null });
  await db.delete(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId));
  if (we) await computeWorkoutKcal(db, we.workoutId);
  return res;
}

export interface CardioAsStrength {
  workoutExerciseId: number;
  workoutId: number;
  date: string;
  exerciseId: string;
  name: string;
  /** Tipo de cardio equivalente. */
  type: string;
  /** Minutos probables (suma de las «reps» si parecen minutos), o null. */
  guessMin: number | null;
}

/**
 * Ejercicios de cardio de la biblioteca registrados como series dentro de entrenos
 * terminados. No cuentan ni como fuerza ni como cardio hasta que se conviertan.
 */
export async function cardioLoggedAsStrength(db: AppDb): Promise<CardioAsStrength[]> {
  const rows = await db
    .select({
      weId: workoutExercise.id,
      workoutId: workout.id,
      date: workout.date,
      exerciseId: exercise.id,
      name: exercise.nameEs,
      nameEn: exercise.nameEn,
      reps: workoutSet.reps,
      completed: workoutSet.completed,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .leftJoin(workoutSet, eq(workoutSet.workoutExerciseId, workoutExercise.id))
    .where(and(eq(exercise.category, 'cardio'), isNotNull(workout.endedAt)))
    .orderBy(desc(workout.date));
  const out = new Map<number, CardioAsStrength & { reps: number[] }>();
  for (const r of rows) {
    const e =
      out.get(r.weId) ??
      { workoutExerciseId: r.weId, workoutId: r.workoutId, date: r.date, exerciseId: r.exerciseId, name: r.name, type: cardioTypeForExercise(`${r.exerciseId} ${r.nameEn ?? r.name}`), guessMin: null, reps: [] };
    if (r.completed && r.reps) e.reps.push(r.reps);
    out.set(r.weId, e);
  }
  return [...out.values()].map(({ reps, ...e }) => {
    const total = reps.reduce((a, b) => a + b, 0);
    return { ...e, guessMin: total >= 5 && total <= 240 ? total : null };
  });
}
