/** 1RM estimado con la fórmula de Epley. Solo fiable hasta ~12 repeticiones. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export const MAX_REPS_FOR_E1RM = 12;

export function estimated1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null || reps <= 0 || reps > MAX_REPS_FOR_E1RM) return null;
  return epley1RM(weightKg, reps);
}

/** Volumen de una serie (kg × reps). */
export function setVolume(weightKg: number | null, reps: number | null): number {
  return (weightKg ?? 0) * (reps ?? 0);
}
