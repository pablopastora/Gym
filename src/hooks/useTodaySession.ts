import { db } from '@/db/client';
import { nextRoutineDay } from '@/domain/schedule';
import { getActiveRoutineId, getLastWorkoutDayId, routineWithDaysQuery } from '@/repositories/routines';

import { useAsyncQuery, useProfile } from './useDb';

/** Rutina activa y el día que toca hoy según la rotación. */
export function useTodaySession() {
  const profile = useProfile();
  const daysPerWeek = profile?.daysPerWeek ?? 4;
  const { data } = useAsyncQuery('today-session', async () => {
    const id = await getActiveRoutineId(db);
    if (id == null) return { routine: null, lastDayId: null };
    const [routine, lastDayId] = await Promise.all([routineWithDaysQuery(db, id), getLastWorkoutDayId(db)]);
    return { routine: routine ?? null, lastDayId };
  });
  const routine = data?.routine ?? null;
  const today = routine ? nextRoutineDay(routine.days, data?.lastDayId, daysPerWeek) : null;
  return { loading: data === undefined, routine, today, profile };
}
