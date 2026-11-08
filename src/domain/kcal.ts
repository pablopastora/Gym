/**
 * Estimación de kcal (aproximada, ±20-30 %): kcal = MET × peso (kg) × horas.
 * Valores MET del Compendium of Physical Activities (Ainsworth et al., 2011/2024).
 */
import type { SetType } from '@/db/schema';

export type StrengthLevel = 'ligero' | 'moderado' | 'intenso';
export const STRENGTH_MET: Record<StrengthLevel, number> = { ligero: 3.5, moderado: 5, intenso: 6 };
export const STRENGTH_LEVEL_LABEL: Record<StrengthLevel, string> = { ligero: 'ligera', moderado: 'moderada', intenso: 'intensa' };

export interface KcalSet {
  setType: SetType;
  completed: boolean;
  weightKg: number | null;
  reps: number | null;
  rir?: number | null;
  rpe?: number | null;
}

export interface StrengthEstimate {
  kcal: number;
  met: number;
  level: StrengthLevel;
  effectiveMin: number;
  workingSets: number;
  /** Explicación de los factores usados. */
  factors: string[];
}

/**
 * Duración efectiva: la real, pero limitada a lo razonable para las series hechas
 * (si se olvidó terminar la sesión, no cuenta el tiempo de más).
 */
export function effectiveMinutes(totalMin: number, completedSets: number): number {
  if (completedSets <= 0) return 0;
  const cap = completedSets * 3.5 + 10;
  return Math.max(Math.min(totalMin, cap), Math.min(completedSets, totalMin));
}

/**
 * Intensidad según:
 *  - esfuerzo (RIR medio ≤ 1 o RPE ≥ 9 → +1; RIR ≥ 4 o RPE ≤ 6 → −1),
 *  - densidad (series de trabajo por hora: ≥ 20 → +1 por descansos cortos; ≤ 10 → −1),
 *  - volumen (series de trabajo: ≥ 20 → +1; ≤ 8 → −1).
 * Puntuación ≥ 2 → intenso; ≤ −1 → ligero; resto → moderado.
 */
export function estimateStrengthKcal(input: { sets: KcalSet[]; totalMin: number; bodyKg: number }): StrengthEstimate {
  const done = input.sets.filter((s) => s.completed && (s.reps ?? 0) > 0);
  const working = done.filter((s) => s.setType !== 'calentamiento');
  const effectiveMin = effectiveMinutes(input.totalMin, done.length);
  const factors: string[] = [];
  let score = 0;

  const rirs = working.map((s) => s.rir).filter((v): v is number => v != null);
  const rpes = working.map((s) => s.rpe).filter((v): v is number => v != null);
  if (rirs.length >= Math.max(1, working.length / 2)) {
    const avg = rirs.reduce((a, b) => a + b, 0) / rirs.length;
    if (avg <= 1) {
      score++;
      factors.push('series cerca del fallo (RIR ≤ 1)');
    }
    else if (avg >= 4) {
      score--;
      factors.push('esfuerzo bajo (RIR ≥ 4)');
    }
  } else if (rpes.length >= Math.max(1, working.length / 2)) {
    const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
    if (avg >= 9) {
      score++;
      factors.push('esfuerzo alto (RPE ≥ 9)');
    }
    else if (avg <= 6) {
      score--;
      factors.push('esfuerzo bajo (RPE ≤ 6)');
    }
  }
  if (effectiveMin > 0) {
    const perHour = working.length / (effectiveMin / 60);
    if (perHour >= 20) {
      score++;
      factors.push('descansos cortos');
    }
    else if (perHour <= 10) {
      score--;
      factors.push('descansos largos');
    }
  }
  if (working.length >= 20) {
      score++;
      factors.push('mucho volumen');
    }
  else if (working.length <= 8) {
      score--;
      factors.push('poco volumen');
    }

  const level: StrengthLevel = score >= 2 ? 'intenso' : score <= -1 ? 'ligero' : 'moderado';
  const met = STRENGTH_MET[level];
  const kcal = Math.round(met * input.bodyKg * (effectiveMin / 60));
  return { kcal, met, level, effectiveMin: Math.round(effectiveMin), workingSets: working.length, factors };
}

export const KCAL_EXPLANATION =
  'Estimación aproximada (±20-30 %): kcal = MET × tu peso más reciente × horas.\n\n' +
  'Fuerza: MET 3,5 (ligera), 5 (moderada) o 6 (intensa) según el esfuerzo (RIR/RPE), los descansos (series por hora) y el volumen. ' +
  'Solo cuenta el tiempo efectivo (si olvidas terminar la sesión no suma de más).\n\n' +
  'Cardio: ecuaciones del ACSM para caminar y correr (velocidad y pendiente) y MET por tipo e intensidad para el resto. Toca la «i» del cardio para ver el detalle.\n\n' +
  'Valores del Compendium of Physical Activities. Úsalo como orientación, no como dato exacto.';
