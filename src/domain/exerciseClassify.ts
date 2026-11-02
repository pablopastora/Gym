import { LOWER_BODY_MUSCLES } from '@/data/labels';
import type { BodyRegion, ExerciseKind } from '@/db/schema';

export interface SourceExerciseLike {
  primaryMuscles: string[];
  mechanic: string | null;
  category: string;
}

export function classifyRegion(primaryMuscles: string[]): BodyRegion {
  if (!primaryMuscles.length) return 'cuerpo_completo';
  const lower = primaryMuscles.filter((m) => LOWER_BODY_MUSCLES.has(m)).length;
  const core = primaryMuscles.filter((m) => m === 'abdominals').length;
  if (core === primaryMuscles.length) return 'core';
  if (lower > primaryMuscles.length / 2) return 'inferior';
  if (lower === 0) return 'superior';
  return 'cuerpo_completo';
}

export function classifyKind(x: SourceExerciseLike): ExerciseKind {
  if (x.category === 'cardio') return 'cardio';
  if (x.category === 'stretching') return 'estiramiento';
  if (x.primaryMuscles.includes('abdominals')) return 'abs';
  return x.mechanic === 'compound' ? 'compuesto' : 'accesorio';
}

export interface RestDefaults {
  restCompoundS: number;
  restAccessoryS: number;
  restAbsS: number;
}

export const DEFAULT_REST: RestDefaults = { restCompoundS: 150, restAccessoryS: 75, restAbsS: 50 };

/** Descanso recomendado: específico de la rutina > específico del ejercicio > por tipo. */
export function resolveRest(
  kind: ExerciseKind,
  defaults: RestDefaults,
  exerciseRestS?: number | null,
  routineRestS?: number | null,
): number {
  if (routineRestS != null) return routineRestS;
  if (exerciseRestS != null) return exerciseRestS;
  switch (kind) {
    case 'compuesto':
      return defaults.restCompoundS;
    case 'abs':
      return defaults.restAbsS;
    default:
      return defaults.restAccessoryS;
  }
}

/** Incremento de carga según región (tren inferior usa el incremento grande). */
export function incrementFor(region: BodyRegion, inc: { upper: number; lower: number }): number {
  return region === 'inferior' ? inc.lower : inc.upper;
}
