/** Calculadora de discos: qué poner en cada lado de la barra. */
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
  /** Discos por lado, de mayor a menor. */
  perSide: number[];
  /** Peso total que se consigue con esos discos. */
  achievedKg: number;
  /** Diferencia con el objetivo (positiva = falta). */
  remainderKg: number;
  /** El objetivo es menor que la barra. */
  belowBar: boolean;
}

/** Reparto voraz (de mayor a menor) suponiendo pares ilimitados de cada disco. */
export function plateBreakdown(targetKg: number, barKg: number, plates: number[] = DEFAULT_PLATES): PlateResult {
  if (targetKg <= barKg) return { perSide: [], achievedKg: barKg, remainderKg: Math.max(0, targetKg - barKg), belowBar: targetKg < barKg };
  const sorted = [...new Set(plates.filter((p) => p > 0))].sort((a, b) => b - a);
  let side = Math.round(((targetKg - barKg) / 2) * 1000) / 1000;
  const perSide: number[] = [];
  for (const p of sorted) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  const achievedKg = barKg + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, achievedKg, remainderKg: Math.round((targetKg - achievedKg) * 1000) / 1000, belowBar: false };
}

/** «20 + 10 + 2,5» */
export function formatPlates(perSide: number[]): string {
  return perSide.length ? perSide.map((p) => String(p).replace('.', ',')).join(' + ') : 'Solo la barra';
}

/** Ejercicios con barra cargada con discos (para ofrecer la calculadora). */
export function usesPlates(equipment: string | null | undefined) {
  return equipment === 'barbell' || equipment === 'e-z curl bar';
}
