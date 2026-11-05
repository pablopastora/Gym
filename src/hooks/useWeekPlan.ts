import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { db } from '@/db/client';
import { getWeekPlan } from '@/repositories/plan';

import { useAsyncQuery } from './useDb';
import { useToday } from './useToday';

/** Plan de la semana reactivo: se recalcula al cambiar la BD, el día o al volver a la pantalla. */
export function useWeekPlan() {
  const today = useToday();
  const { data, reload } = useAsyncQuery(`week-plan-${today}`, () => getWeekPlan(db, today));
  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  return { today, loading: data === undefined, ...(data ?? { plan: null, routine: null, profile: null, weekdays: [], hasOverrides: false }) };
}
