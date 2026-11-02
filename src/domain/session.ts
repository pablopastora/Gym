/** Estimación de duración de una sesión (minutos): ~40 s por serie + descanso. */
export function estimateSessionMinutes(
  exercises: { sets: number; warmupSets: number; restS: number }[],
): number {
  const secs = exercises.reduce((s, e) => s + e.sets * (40 + e.restS) + e.warmupSets * 60, 0);
  return Math.round(secs / 60 / 5) * 5;
}

export function fmtRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`;
}
