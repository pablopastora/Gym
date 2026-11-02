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

/**
 * Racha en semanas (lunes-domingo) seguidas cumpliendo el objetivo de días.
 * La semana en curso suma si ya se ha cumplido; si aún no, no rompe la racha.
 */
export function weekStreak(workoutDates: string[], today: string, target: number, startOfWeek: (d: string) => string, addDays: (d: string, n: number) => string): number {
  const perWeek = new Map<string, Set<string>>();
  for (const d of workoutDates) {
    const w = startOfWeek(d);
    const set = perWeek.get(w) ?? new Set<string>();
    set.add(d);
    perWeek.set(w, set);
  }
  const count = (w: string) => perWeek.get(w)?.size ?? 0;
  let week = startOfWeek(today);
  let streak = count(week) >= target ? 1 : 0;
  week = addDays(week, -7);
  while (count(week) >= target) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}
