import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toISODate } from '@/domain/dates';

/**
 * Fecha de hoy (YYYY-MM-DD) que se actualiza sola a medianoche y al volver a la app,
 * para que «Hoy» y «Mañana» no se queden con el día anterior.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toISODate());
  useEffect(() => {
    const refresh = () => setToday(toISODate());
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1).getTime() - now.getTime();
    const t = setTimeout(refresh, msToMidnight);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [today]);
  return today;
}
