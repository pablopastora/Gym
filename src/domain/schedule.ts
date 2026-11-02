export interface DayRef {
  id: number;
  sortOrder: number;
  isOptional: boolean;
}

/**
 * Siguiente día de la rutina en rotación: el posterior al último entrenado.
 * Con 4 días/semana se saltan los días opcionales.
 */
export function nextRoutineDay<T extends DayRef>(
  days: T[],
  lastDayId: number | null | undefined,
  daysPerWeek: number,
): T | null {
  const sorted = [...days].sort((a, b) => a.sortOrder - b.sortOrder);
  const usable = daysPerWeek >= 5 ? sorted : sorted.filter((d) => !d.isOptional);
  const pool = usable.length ? usable : sorted;
  if (!pool.length) return null;
  if (lastDayId == null) return pool[0];
  const lastIdx = sorted.findIndex((d) => d.id === lastDayId);
  if (lastIdx === -1) return pool[0];
  const lastOrder = sorted[lastIdx].sortOrder;
  return pool.find((d) => d.sortOrder > lastOrder) ?? pool[0];
}
