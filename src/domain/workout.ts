import type { SetType } from '@/db/schema';

import { fmtNum } from './format';
import { setVolume } from './oneRm';

export function roundTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

export interface PlannedSet {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
}

/** Porcentajes y repeticiones de calentamiento según cuántas series se pidan. */
const WARMUP_SCHEMES: Record<number, [number, number][]> = {
  1: [[0.6, 5]],
  2: [
    [0.5, 8],
    [0.75, 3],
  ],
  3: [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ],
  4: [
    [0, 10], // barra vacía / mínimo
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ],
};

/**
 * Series de calentamiento hacia un peso de trabajo.
 * `minKg` es el mínimo cargable (p. ej. la barra de 20 kg); `step` el redondeo.
 * Si no hay peso de trabajo conocido, devuelve las series con peso vacío.
 */
export function warmupPlan(
  workingKg: number | null,
  count: number,
  { minKg = 0, step = 2.5 }: { minKg?: number; step?: number } = {},
): PlannedSet[] {
  if (count <= 0) return [];
  const scheme = WARMUP_SCHEMES[Math.min(count, 4)];
  return scheme.map(([pct, reps]) => {
    if (workingKg == null || workingKg <= 0) return { setType: 'calentamiento', weightKg: null, reps };
    const w = Math.max(minKg, roundTo(workingKg * pct, step));
    return { setType: 'calentamiento', weightKg: Math.min(w, workingKg), reps };
  });
}

export interface LastSet {
  weightKg: number | null;
  reps: number | null;
}

/**
 * Plan de series para un ejercicio: calentamientos + series de trabajo
 * rellenadas con el peso y las reps de la última sesión (por posición; si la
 * última vez hubo menos series, se repite la última).
 */
export function planExerciseSets(
  cfg: { sets: number; warmupSets: number },
  last: LastSet[] | null,
  warmupOpts?: { minKg?: number; step?: number },
): PlannedSet[] {
  const working: PlannedSet[] = Array.from({ length: Math.max(1, cfg.sets) }, (_, i) => {
    const src = last?.length ? last[Math.min(i, last.length - 1)] : null;
    return { setType: 'normal', weightKg: src?.weightKg ?? null, reps: src?.reps ?? null };
  });
  const topKg = working.reduce<number | null>(
    (m, s) => (s.weightKg != null && (m == null || s.weightKg > m) ? s.weightKg : m),
    null,
  );
  return [...warmupPlan(topKg, cfg.warmupSets, warmupOpts), ...working];
}

/** «80 × 8 · 80 × 8 · 77,5 × 7» (sin peso: «× 12»). */
export function formatSets(sets: LastSet[]): string {
  return sets
    .map((s) => (s.weightKg != null && s.weightKg > 0 ? `${fmtNum(s.weightKg, 2)} × ${s.reps ?? '—'}` : `× ${s.reps ?? '—'}`))
    .join(' · ');
}

export interface SummarySet {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}

export function summarizeSets(sets: SummarySet[]) {
  const done = sets.filter((s) => s.completed && s.setType !== 'calentamiento');
  return {
    workingSets: done.length,
    reps: done.reduce((a, s) => a + (s.reps ?? 0), 0),
    volumeKg: done.reduce((a, s) => a + setVolume(s.weightKg, s.reps), 0),
  };
}

// ───────────── Temporizador de descanso (basado en hora de fin) ─────────────

export interface RestState {
  endAt: number;
  totalS: number;
}

export function restRemainingS(state: RestState | null, now: number): number {
  if (!state) return 0;
  return Math.max(0, Math.ceil((state.endAt - now) / 1000));
}

/** Suma o resta segundos al descanso. Devuelve null si el descanso queda en 0. */
export function adjustRest(state: RestState, deltaS: number, now: number): RestState | null {
  const endAt = state.endAt + deltaS * 1000;
  if (endAt <= now) return null;
  return { endAt, totalS: Math.max(state.totalS + deltaS, Math.ceil((endAt - now) / 1000)) };
}

// ───────────── Reordenación ─────────────

/** Mueve el elemento `index` una posición arriba (-1) o abajo (+1). Devuelve un array nuevo. */
export function moveItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (index < 0 || index >= items.length || j < 0 || j >= items.length) return items;
  const out = [...items];
  [out[index], out[j]] = [out[j], out[index]];
  return out;
}
