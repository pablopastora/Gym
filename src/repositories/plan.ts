import { and, asc, gte, isNotNull } from 'drizzle-orm';

import { profile, workout } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { startOfWeek } from '@/domain/dates';
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
  const plan = buildWeekPlan<PlanRoutineDay>({
    today,
    trainingWeekdays: weekdays,
    routineDays: routine?.days ?? [],
    daysPerWeek: weekdays.length,
    lastDoneDayId: await getLastWorkoutDayId(db),
    doneByDate,
  });
  return { plan, routine, profile: p ?? null, weekdays };
}
