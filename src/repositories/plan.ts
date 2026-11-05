import { and, asc, gte, isNotNull, lte } from 'drizzle-orm';

import { dayOverride, profile, workout } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { addDays, startOfWeek } from '@/domain/dates';
import { buildWeekPlan, resolveTrainingWeekdays, type DoneWorkout } from '@/domain/weekPlan';

import { getActiveRoutineId, getLastWorkoutDayId, routineWithDaysQuery, type RoutineWithDays } from './routines';

export type PlanRoutineDay = RoutineWithDays['days'][number];

/** Plan de la semana (hoy, mañana, resto) a partir de la base de datos. `today` se inyecta. */
export async function getWeekPlan(db: AppDb, today: string) {
  const [p] = await db.select().from(profile).limit(1);
  const routineId = await getActiveRoutineId(db);
  const routine = routineId != null ? ((await routineWithDaysQuery(db, routineId)) ?? null) : null;
  const weekdays = resolveTrainingWeekdays(p ?? { daysPerWeek: 4 });
  const rows = await db
    .select({ id: workout.id, name: workout.name, routineDayId: workout.routineDayId, isDeload: workout.isDeload, date: workout.date })
    .from(workout)
    .where(and(isNotNull(workout.endedAt), gte(workout.date, startOfWeek(today))))
    .orderBy(asc(workout.startedAt));
  const doneByDate = new Map<string, DoneWorkout[]>();
  for (const r of rows) doneByDate.set(r.date, [...(doneByDate.get(r.date) ?? []), r]);
  const ovRows = await db
    .select()
    .from(dayOverride)
    .where(and(gte(dayOverride.date, startOfWeek(today)), lte(dayOverride.date, addDays(startOfWeek(today), 7))));
  const overrides = new Map(ovRows.map((o) => [o.date, o.training]));
  const plan = buildWeekPlan<PlanRoutineDay>({
    overrides,
    today,
    trainingWeekdays: weekdays,
    routineDays: routine?.days ?? [],
    daysPerWeek: weekdays.length,
    lastDoneDayId: await getLastWorkoutDayId(db),
    doneByDate,
  });
  return { plan, routine, profile: p ?? null, weekdays, hasOverrides: ovRows.length > 0 };
}

/**
 * Mueve la sesión de `from` a `to`: `from` pasa a descanso y `to` a día de entreno.
 * Si `to` ya era de entreno, el resto de la semana se desplaza una sesión.
 */
export async function moveSession(db: AppDb, from: string, to: string) {
  for (const [date, training] of [
    [from, false],
    [to, true],
  ] as const) {
    await db.insert(dayOverride).values({ date, training }).onConflictDoUpdate({ target: dayOverride.date, set: { training } });
  }
}

/** Deshace los cambios puntuales de la semana de `today`. */
export async function clearWeekOverrides(db: AppDb, today: string) {
  const ws = startOfWeek(today);
  await db.delete(dayOverride).where(and(gte(dayOverride.date, ws), lte(dayOverride.date, addDays(ws, 7))));
}
