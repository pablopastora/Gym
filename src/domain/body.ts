import { addDays, diffDays, startOfWeek } from './dates';

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

/** Índice de masa corporal (kg/m²). */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiCategory = 'bajo' | 'normal' | 'sobrepeso' | 'obesidad';

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'bajo';
  if (value < 25) return 'normal';
  if (value < 30) return 'sobrepeso';
  return 'obesidad';
}

export const BMI_LABELS: Record<BmiCategory, string> = {
  bajo: 'Bajo peso',
  normal: 'Normal',
  sobrepeso: 'Sobrepeso',
  obesidad: 'Obesidad',
};

/** Peso que corresponde a un IMC dado para una altura. */
export function weightForBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

function sortByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Media móvil de 7 días naturales: para cada registro, media de todos los
 * registros de ese día y los 6 anteriores. No se inventan datos para días vacíos.
 */
export function movingAverage7(entries: WeightEntry[]): { date: string; trendKg: number }[] {
  const sorted = sortByDate(entries);
  const out: { date: string; trendKg: number }[] = [];
  let start = 0;
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i].weightKg;
    while (diffDays(sorted[start].date, sorted[i].date) > 6) {
      sum -= sorted[start].weightKg;
      start++;
    }
    out.push({ date: sorted[i].date, trendKg: sum / (i - start + 1) });
  }
  return out;
}

/** Tendencia más reciente (media de los últimos 7 días respecto a `today`), o null. */
export function currentTrend(entries: WeightEntry[], today: string): number | null {
  const window = entries.filter((e) => {
    const d = diffDays(e.date, today);
    return d >= 0 && d <= 6;
  });
  if (!window.length) return null;
  return window.reduce((s, e) => s + e.weightKg, 0) / window.length;
}

export interface WeekSummary {
  weekStart: string;
  avgKg: number | null;
  prevAvgKg: number | null;
  /** avg - prevAvg (negativo = bajando). */
  changeKg: number | null;
  entries: number;
}

/** Peso medio de la semana (lunes-domingo) que contiene `today`, comparado con la anterior. */
export function weeklySummary(entries: WeightEntry[], today: string): WeekSummary {
  const ws = startOfWeek(today);
  const prevWs = addDays(ws, -7);
  const inRange = (from: string, to: string) =>
    entries.filter((e) => e.date >= from && e.date <= to).map((e) => e.weightKg);
  const cur = inRange(ws, addDays(ws, 6));
  const prev = inRange(prevWs, addDays(prevWs, 6));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgKg = avg(cur);
  const prevAvgKg = avg(prev);
  return {
    weekStart: ws,
    avgKg,
    prevAvgKg,
    changeKg: avgKg != null && prevAvgKg != null ? avgKg - prevAvgKg : null,
    entries: cur.length,
  };
}
