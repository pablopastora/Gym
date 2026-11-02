import { asc, desc, eq, isNotNull } from 'drizzle-orm';

import { routine, routineDay, routineExercise, workout } from '@/db/schema';
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
    .where(isNotNull(workout.endedAt))
    .orderBy(desc(workout.startedAt))
    .limit(1);
  return rows[0]?.dayId ?? null;
}
