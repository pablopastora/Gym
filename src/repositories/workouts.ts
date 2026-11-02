import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm';

import {
  exercise,
  routineDay,
  routineExercise,
  workout,
  workoutExercise,
  workoutSet,
  type Exercise,
  type Profile,
  type SetType,
} from '@/db/schema';
import type { AppDb } from '@/db/types';
import { toISODate } from '@/domain/dates';
import { resolveRest } from '@/domain/exerciseClassify';
import { moveItem, planExerciseSets, type LastSet } from '@/domain/workout';

/** Descanso tras una serie de calentamiento (s). */
export const WARMUP_REST_S = 60;

type RestProfile = Pick<Profile, 'restCompoundS' | 'restAccessoryS' | 'restAbsS' | 'barKg'>;

export async function getActiveWorkout(db: AppDb) {
  const rows = await db
    .select()
    .from(workout)
    .where(isNull(workout.endedAt))
    .orderBy(desc(workout.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export interface LastPerformance {
  workoutId: number;
  date: string;
  sets: LastSet[];
}

/** Series de trabajo completadas en la última sesión terminada que incluyó el ejercicio. */
export async function getLastPerformance(
  db: AppDb,
  exerciseId: string,
  excludeWorkoutId?: number,
): Promise<LastPerformance | null> {
  const conds = [eq(workoutExercise.exerciseId, exerciseId), isNotNull(workout.endedAt)];
  if (excludeWorkoutId != null) conds.push(ne(workout.id, excludeWorkoutId));
  const rows = await db
    .select({ weId: workoutExercise.id, workoutId: workout.id, date: workout.date })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(...conds))
    .orderBy(desc(workout.startedAt), desc(workoutExercise.id));
  for (const r of rows) {
    const sets = await db
      .select({ weightKg: workoutSet.weightKg, reps: workoutSet.reps })
      .from(workoutSet)
      .where(
        and(
          eq(workoutSet.workoutExerciseId, r.weId),
          eq(workoutSet.completed, true),
          ne(workoutSet.setType, 'calentamiento'),
        ),
      )
      .orderBy(asc(workoutSet.sortOrder));
    if (sets.length) return { workoutId: r.workoutId, date: r.date, sets };
  }
  return null;
}

function warmupOpts(ex: Pick<Exercise, 'equipment'>, profile: RestProfile) {
  return { minKg: ex.equipment === 'barbell' ? profile.barKg : 0, step: 2.5 };
}

async function insertPlannedExercise(
  db: AppDb,
  params: {
    workoutId: number;
    ex: Exercise;
    sortOrder: number;
    sets: number;
    warmupSets: number;
    repMin: number;
    repMax: number;
    restS: number | null;
    notes: string | null;
    profile: RestProfile;
  },
) {
  const { workoutId, ex, profile } = params;
  const last = await getLastPerformance(db, ex.id, workoutId);
  const plan = planExerciseSets({ sets: params.sets, warmupSets: params.warmupSets }, last?.sets ?? null, warmupOpts(ex, profile));
  const [we] = await db
    .insert(workoutExercise)
    .values({
      workoutId,
      exerciseId: ex.id,
      sortOrder: params.sortOrder,
      repMin: params.repMin,
      repMax: params.repMax,
      restS: resolveRest(ex.kind, profile, ex.defaultRestS, params.restS),
      notes: params.notes,
    })
    .returning({ id: workoutExercise.id });
  await db.insert(workoutSet).values(
    plan.map((s, i) => ({ workoutExerciseId: we.id, sortOrder: i, setType: s.setType, weightKg: s.weightKg, reps: s.reps })),
  );
  return we.id;
}

/** Crea la sesión a partir de un día de rutina, con los datos de la última vez ya rellenados. */
export async function startWorkoutFromDay(db: AppDb, dayId: number, profile: RestProfile, now = Date.now()) {
  const day = await db.query.routineDay.findFirst({
    where: eq(routineDay.id, dayId),
    with: { exercises: { orderBy: asc(routineExercise.sortOrder), with: { exercise: true } } },
  });
  if (!day) throw new Error('Día de rutina no encontrado');
  const [w] = await db
    .insert(workout)
    .values({ startedAt: now, date: toISODate(new Date(now)), routineDayId: day.id, name: day.name })
    .returning({ id: workout.id });
  for (const [i, re] of day.exercises.entries()) {
    await insertPlannedExercise(db, {
      workoutId: w.id,
      ex: re.exercise,
      sortOrder: i,
      sets: re.sets,
      warmupSets: re.warmupSets,
      repMin: re.repMin,
      repMax: re.repMax,
      restS: re.restS,
      notes: re.notes,
      profile,
    });
  }
  return w.id;
}

export async function startEmptyWorkout(db: AppDb, now = Date.now(), name = 'Entreno libre') {
  const [w] = await db
    .insert(workout)
    .values({ startedAt: now, date: toISODate(new Date(now)), name })
    .returning({ id: workout.id });
  return w.id;
}

export async function addExerciseToWorkout(db: AppDb, workoutId: number, exerciseId: string, profile: RestProfile) {
  const [ex] = await db.select().from(exercise).where(eq(exercise.id, exerciseId));
  const existing = await db
    .select({ id: workoutExercise.id })
    .from(workoutExercise)
    .where(eq(workoutExercise.workoutId, workoutId));
  return insertPlannedExercise(db, {
    workoutId,
    ex,
    sortOrder: existing.length,
    sets: 3,
    warmupSets: 0,
    repMin: ex.kind === 'compuesto' ? 6 : 10,
    repMax: ex.kind === 'compuesto' ? 10 : 15,
    restS: null,
    notes: null,
    profile,
  });
}

/** Sustituye el ejercicio y rellena las series pendientes con la última vez del nuevo. */
export async function substituteWorkoutExercise(db: AppDb, weId: number, newExerciseId: string, profile: RestProfile) {
  const [we] = await db.select().from(workoutExercise).where(eq(workoutExercise.id, weId));
  const [ex] = await db.select().from(exercise).where(eq(exercise.id, newExerciseId));
  await db
    .update(workoutExercise)
    .set({ exerciseId: ex.id, restS: resolveRest(ex.kind, profile, ex.defaultRestS) })
    .where(eq(workoutExercise.id, weId));
  const last = await getLastPerformance(db, ex.id, we.workoutId);
  const pending = await db
    .select()
    .from(workoutSet)
    .where(and(eq(workoutSet.workoutExerciseId, weId), eq(workoutSet.completed, false), ne(workoutSet.setType, 'calentamiento')))
    .orderBy(asc(workoutSet.sortOrder));
  for (const [i, s] of pending.entries()) {
    const src = last?.sets.length ? last.sets[Math.min(i, last.sets.length - 1)] : null;
    await db
      .update(workoutSet)
      .set({ weightKg: src?.weightKg ?? null, reps: src?.reps ?? null })
      .where(eq(workoutSet.id, s.id));
  }
}

export async function removeWorkoutExercise(db: AppDb, weId: number) {
  await db.delete(workoutExercise).where(eq(workoutExercise.id, weId));
}

export async function moveWorkoutExercise(db: AppDb, workoutId: number, weId: number, dir: -1 | 1) {
  const rows = await db
    .select({ id: workoutExercise.id })
    .from(workoutExercise)
    .where(eq(workoutExercise.workoutId, workoutId))
    .orderBy(asc(workoutExercise.sortOrder), asc(workoutExercise.id));
  const ids = moveItem(
    rows.map((r) => r.id),
    rows.findIndex((r) => r.id === weId),
    dir,
  );
  for (const [i, id] of ids.entries()) {
    await db.update(workoutExercise).set({ sortOrder: i }).where(eq(workoutExercise.id, id));
  }
}

export async function setWorkoutExerciseNotes(db: AppDb, weId: number, notes: string) {
  await db
    .update(workoutExercise)
    .set({ notes: notes.trim() || null })
    .where(eq(workoutExercise.id, weId));
}

/** Añade una serie copiando peso y reps de la última serie del ejercicio. */
export async function addSet(db: AppDb, weId: number, setType: SetType = 'normal') {
  const sets = await db
    .select()
    .from(workoutSet)
    .where(eq(workoutSet.workoutExerciseId, weId))
    .orderBy(asc(workoutSet.sortOrder));
  const lastWorking = [...sets].reverse().find((s) => s.setType !== 'calentamiento');
  const [row] = await db
    .insert(workoutSet)
    .values({
      workoutExerciseId: weId,
      sortOrder: (sets.at(-1)?.sortOrder ?? -1) + 1,
      setType,
      weightKg: lastWorking?.weightKg ?? null,
      reps: lastWorking?.reps ?? null,
    })
    .returning({ id: workoutSet.id });
  return row.id;
}

export type SetPatch = Partial<{
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
  setType: SetType;
}>;

export async function updateSet(db: AppDb, setId: number, patch: SetPatch) {
  await db.update(workoutSet).set(patch).where(eq(workoutSet.id, setId));
}

export async function completeSet(db: AppDb, setId: number, values: SetPatch, now = Date.now()) {
  await db
    .update(workoutSet)
    .set({ ...values, completed: true, completedAt: now })
    .where(eq(workoutSet.id, setId));
}

export async function uncompleteSet(db: AppDb, setId: number) {
  await db.update(workoutSet).set({ completed: false, completedAt: null }).where(eq(workoutSet.id, setId));
}

export async function deleteSet(db: AppDb, setId: number) {
  await db.delete(workoutSet).where(eq(workoutSet.id, setId));
}

export function workoutDetailQuery(db: AppDb, workoutId: number) {
  return db.query.workout.findFirst({
    where: eq(workout.id, workoutId),
    with: {
      exercises: {
        orderBy: [asc(workoutExercise.sortOrder), asc(workoutExercise.id)],
        with: { exercise: true, sets: { orderBy: asc(workoutSet.sortOrder) } },
      },
    },
  });
}

export type WorkoutDetail = NonNullable<Awaited<ReturnType<typeof workoutDetailQuery>>>;

/**
 * Termina la sesión: elimina series sin completar y ejercicios vacíos.
 * Devuelve el número de series completadas.
 */
export async function finishWorkout(db: AppDb, workoutId: number, now = Date.now()) {
  const wes = await db
    .select({ id: workoutExercise.id })
    .from(workoutExercise)
    .where(eq(workoutExercise.workoutId, workoutId));
  const weIds = wes.map((w) => w.id);
  if (weIds.length) {
    await db.delete(workoutSet).where(and(inArray(workoutSet.workoutExerciseId, weIds), eq(workoutSet.completed, false)));
    for (const id of weIds) {
      const left = await db.select({ id: workoutSet.id }).from(workoutSet).where(eq(workoutSet.workoutExerciseId, id)).limit(1);
      if (!left.length) await db.delete(workoutExercise).where(eq(workoutExercise.id, id));
    }
  }
  await db.update(workout).set({ endedAt: now }).where(eq(workout.id, workoutId));
  const remaining = await db
    .select({ id: workoutSet.id })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .where(eq(workoutExercise.workoutId, workoutId));
  return remaining.length;
}

export async function discardWorkout(db: AppDb, workoutId: number) {
  await db.delete(workout).where(eq(workout.id, workoutId));
}

export async function updateWorkoutNotes(db: AppDb, workoutId: number, notes: string) {
  await db.update(workout).set({ notes: notes.trim() || null }).where(eq(workout.id, workoutId));
}

export function recentWorkoutsQuery(db: AppDb, limit = 20) {
  return db.query.workout.findMany({
    where: isNotNull(workout.endedAt),
    orderBy: desc(workout.startedAt),
    limit,
    with: { exercises: { with: { sets: true } } },
  });
}
