import { asc, isNotNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { workout, type Profile } from '@/db/schema';
import { mesoWeek, type MesoWeek } from '@/domain/setPlan';

import { useAsyncQuery } from './useDb';

/** Semana del mesociclo (null si el plan automático está desactivado). */
export function useMesoWeek(profile: Profile | null | undefined, today: string): MesoWeek | null {
  const { data } = useAsyncQuery(`meso-${today}-${profile?.lastDeloadDate}-${profile?.mesoStart}-${profile?.autoSetPlan}`, async () => {
    if (!profile?.autoSetPlan) return null;
    const [first] = await db.select({ date: workout.date }).from(workout).where(isNotNull(workout.endedAt)).orderBy(asc(workout.startedAt)).limit(1);
    return mesoWeek(today, { lastDeloadDate: profile.lastDeloadDate, mesoStart: profile.mesoStart, firstWorkoutDate: first?.date ?? null });
  });
  return data ?? null;
}
