import { and, asc, desc, eq, isNotNull, max } from 'drizzle-orm';

import { exercise, profile, routine, routineDay, routineExercise, workout, type RoutineExercise } from '@/db/schema';
import { recommendedScheme, resolveRole } from '@/domain/setPlan';
import { moveItem } from '@/domain/workout';
import type { AppDb } from '@/db/types';

export function routineWithDaysQuery(db: AppDb, routineId: number) {
  return db.query.routine.findFirst({
    where: eq(routine.id, routineId),
    with: {
      days: {
        orderBy: asc(routineDay.sortOrder),
        with: {
          exercises: {
            orderBy: asc(routineExercise.sortOrder),
            with: { exercise: true },
          },
        },
      },
    },
  });
}

export type RoutineWithDays = NonNullable<Awaited<ReturnType<typeof routineWithDaysQuery>>>;

export async function getActiveRoutineId(db: AppDb): Promise<number | null> {
  const rows = await db
    .select({ id: routine.id })
    .from(routine)
    .where(eq(routine.isActive, true))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function getLastWorkoutDayId(db: AppDb): Promise<number | null> {
  const rows = await db
    .select({ dayId: workout.routineDayId })
    .from(workout)
    // Solo entrenos de rutina: un «entreno libre» no debe reiniciar la rotación.
    .where(and(isNotNull(workout.endedAt), isNotNull(workout.routineDayId)))
    .orderBy(desc(workout.startedAt))
    .limit(1);
  return rows[0]?.dayId ?? null;
}

// ───────────── Edición de rutinas ─────────────

export async function createRoutine(db: AppDb, name: string) {
  const [{ m }] = await db.select({ m: max(routine.sortOrder) }).from(routine);
  const [r] = await db
    .insert(routine)
    .values({ name: name.trim() || 'Nueva rutina', sortOrder: (m ?? -1) + 1 })
    .returning({ id: routine.id });
  await addDay(db, r.id, 'Día 1');
  return r.id;
}

export async function renameRoutine(db: AppDb, id: number, name: string) {
  if (name.trim()) await db.update(routine).set({ name: name.trim() }).where(eq(routine.id, id));
}

export async function setActiveRoutine(db: AppDb, id: number) {
  await db.update(routine).set({ isActive: false });
  await db.update(routine).set({ isActive: true }).where(eq(routine.id, id));
}

export async function deleteRoutine(db: AppDb, id: number) {
  const [r] = await db.select().from(routine).where(eq(routine.id, id));
  await db.delete(routine).where(eq(routine.id, id));
  if (r?.isActive) {
    const [first] = await db.select({ id: routine.id }).from(routine).orderBy(asc(routine.sortOrder)).limit(1);
    if (first) await setActiveRoutine(db, first.id);
  }
}

export async function duplicateRoutine(db: AppDb, id: number) {
  const src = await routineWithDaysQuery(db, id);
  if (!src) throw new Error('Rutina no encontrada');
  const [{ m }] = await db.select({ m: max(routine.sortOrder) }).from(routine);
  const [r] = await db
    .insert(routine)
    .values({ name: `${src.name} (copia)`, notes: src.notes, sortOrder: (m ?? -1) + 1 })
    .returning({ id: routine.id });
  for (const d of src.days) {
    const [nd] = await db
      .insert(routineDay)
      .values({ routineId: r.id, name: d.name, sortOrder: d.sortOrder, isOptional: d.isOptional, cardioNote: d.cardioNote, notes: d.notes })
      .returning({ id: routineDay.id });
    if (d.exercises.length) {
      await db.insert(routineExercise).values(
        d.exercises.map(({ id: _id, routineDayId: _d, exercise: _e, ...rest }) => ({ ...rest, routineDayId: nd.id })),
      );
    }
  }
  return r.id;
}

export async function addDay(db: AppDb, routineId: number, name?: string) {
  const days = await db.select({ id: routineDay.id }).from(routineDay).where(eq(routineDay.routineId, routineId));
  const [d] = await db
    .insert(routineDay)
    .values({ routineId, name: name ?? `Día ${days.length + 1}`, sortOrder: days.length })
    .returning({ id: routineDay.id });
  return d.id;
}

export async function updateDay(
  db: AppDb,
  dayId: number,
  patch: Partial<{ name: string; isOptional: boolean; cardioNote: string | null; notes: string | null }>,
) {
  await db.update(routineDay).set(patch).where(eq(routineDay.id, dayId));
}

export async function deleteDay(db: AppDb, dayId: number) {
  await db.delete(routineDay).where(eq(routineDay.id, dayId));
}

async function reorder(
  db: AppDb,
  kind: 'day' | 'exercise',
  ids: number[],
) {
  for (const [i, id] of ids.entries()) {
    if (kind === 'day') await db.update(routineDay).set({ sortOrder: i }).where(eq(routineDay.id, id));
    else await db.update(routineExercise).set({ sortOrder: i }).where(eq(routineExercise.id, id));
  }
}

export async function moveDay(db: AppDb, dayId: number, dir: -1 | 1) {
  const [d] = await db.select().from(routineDay).where(eq(routineDay.id, dayId));
  const rows = await db
    .select({ id: routineDay.id })
    .from(routineDay)
    .where(eq(routineDay.routineId, d.routineId))
    .orderBy(asc(routineDay.sortOrder), asc(routineDay.id));
  const ids = rows.map((r) => r.id);
  await reorder(db, 'day', moveItem(ids, ids.indexOf(dayId), dir));
}

export async function addRoutineExercise(db: AppDb, dayId: number, exerciseId: string) {
  const [ex] = await db.select().from(exercise).where(eq(exercise.id, exerciseId));
  const [p] = await db.select({ deficit: profile.deficitMode }).from(profile).limit(1);
  const rows = await db.select({ id: routineExercise.id }).from(routineExercise).where(eq(routineExercise.routineDayId, dayId));
  const role = resolveRole(ex);
  const scheme = recommendedScheme(role, p?.deficit ?? true);
  const [re] = await db
    .insert(routineExercise)
    .values({
      routineDayId: dayId,
      exerciseId,
      sortOrder: rows.length,
      sets: scheme.sets,
      repMin: scheme.repMin,
      repMax: scheme.repMax,
      warmupSets: role === 'basico' ? 2 : 0,
    })
    .returning({ id: routineExercise.id });
  return re.id;
}

export type RoutineExercisePatch = Partial<
  Pick<RoutineExercise, 'sets' | 'repMin' | 'repMax' | 'restS' | 'warmupSets' | 'notes' | 'exerciseId' | 'topSet'>
>;

export async function updateRoutineExercise(db: AppDb, id: number, patch: RoutineExercisePatch) {
  await db.update(routineExercise).set(patch).where(eq(routineExercise.id, id));
}

export async function deleteRoutineExercise(db: AppDb, id: number) {
  await db.delete(routineExercise).where(eq(routineExercise.id, id));
}

export async function moveRoutineExercise(db: AppDb, id: number, dir: -1 | 1) {
  const [re] = await db.select().from(routineExercise).where(eq(routineExercise.id, id));
  const rows = await db
    .select({ id: routineExercise.id })
    .from(routineExercise)
    .where(eq(routineExercise.routineDayId, re.routineDayId))
    .orderBy(asc(routineExercise.sortOrder), asc(routineExercise.id));
  const ids = rows.map((r) => r.id);
  await reorder(db, 'exercise', moveItem(ids, ids.indexOf(id), dir));
}

export function routineExerciseQuery(db: AppDb, id: number) {
  return db.query.routineExercise.findFirst({
    where: eq(routineExercise.id, id),
    with: { exercise: true, day: true },
  });
}

/** Superserie con el siguiente ejercicio del día (o la deshace si ya lo era). */
export async function toggleRoutineSuperset(db: AppDb, id: number) {
  const [re] = await db.select().from(routineExercise).where(eq(routineExercise.id, id));
  const rows = await db
    .select()
    .from(routineExercise)
    .where(eq(routineExercise.routineDayId, re.routineDayId))
    .orderBy(asc(routineExercise.sortOrder), asc(routineExercise.id));
  const i = rows.findIndex((r) => r.id === id);
  const next = rows[i + 1];
  if (re.supersetGroup != null && next?.supersetGroup === re.supersetGroup) {
    await db.update(routineExercise).set({ supersetGroup: null }).where(eq(routineExercise.id, next.id));
    // Si el ejercicio se queda solo en su grupo, también se desagrupa.
    const left = rows.filter((r) => r.supersetGroup === re.supersetGroup && r.id !== next.id);
    if (left.length < 2) for (const r of left) await db.update(routineExercise).set({ supersetGroup: null }).where(eq(routineExercise.id, r.id));
    return false;
  }
  if (!next) return false;
  const group = re.supersetGroup ?? next.supersetGroup ?? Math.min(re.id, next.id);
  await db.update(routineExercise).set({ supersetGroup: group }).where(eq(routineExercise.id, re.id));
  await db.update(routineExercise).set({ supersetGroup: group }).where(eq(routineExercise.id, next.id));
  return true;
}
