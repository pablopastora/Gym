/**
 * Mapa muscular semanal: series hechas por grupo frente al objetivo.
 * Músculo principal = 1 serie; secundario = 0,5 (como Fitbod/Strong).
 */
import { WEEKLY_SET_TARGETS } from './adapt';
import { MUSCLE_GROUPS } from './search';

export interface MuscleSetEntry {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Series de trabajo completadas. */
  sets: number;
}

export interface MuscleCell {
  key: string;
  label: string;
  sets: number;
  target: number;
  ratio: number;
  level: 'nada' | 'bajo' | 'medio' | 'objetivo';
}

const groupsOf = (muscles: string[]) => [...new Set(muscles.map((m) => MUSCLE_GROUPS.find((g) => g.muscles.includes(m))?.key).filter((x): x is string => !!x))];

export function weeklyMuscleMap(entries: MuscleSetEntry[], targets: Record<string, number> = WEEKLY_SET_TARGETS): MuscleCell[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const prim = groupsOf(e.primaryMuscles);
    for (const g of prim) totals.set(g, (totals.get(g) ?? 0) + e.sets);
    for (const g of groupsOf(e.secondaryMuscles)) if (!prim.includes(g)) totals.set(g, (totals.get(g) ?? 0) + e.sets * 0.5);
  }
  return MUSCLE_GROUPS.map((g) => {
    const sets = Math.round((totals.get(g.key) ?? 0) * 2) / 2;
    const target = targets[g.key] ?? 6;
    const ratio = target ? sets / target : 0;
    return {
      key: g.key,
      label: g.label,
      sets,
      target,
      ratio,
      level: sets === 0 ? 'nada' : ratio < 0.5 ? 'bajo' : ratio < 1 ? 'medio' : 'objetivo',
    };
  });
}
