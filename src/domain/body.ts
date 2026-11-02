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

// ───────────── Gráfica de peso ─────────────

export interface WeightChartData {
  raw: { x: number; y: number }[];
  trend: { x: number; y: number }[];
  start: string | null;
  end: string | null;
}

/** Puntos para la gráfica: x = días desde el primer registro del rango. */
export function weightChartData(entries: WeightEntry[], fromDate: string | null): WeightChartData {
  const all = movingAverage7(entries);
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const inRange = sorted.filter((e) => !fromDate || e.date >= fromDate);
  if (!inRange.length) return { raw: [], trend: [], start: null, end: null };
  const start = inRange[0].date;
  const x = (d: string) => diffDays(start, d);
  return {
    raw: inRange.map((e) => ({ x: x(e.date), y: e.weightKg })),
    trend: all.filter((t) => t.date >= start).map((t) => ({ x: x(t.date), y: t.trendKg })),
    start,
    end: inRange[inRange.length - 1].date,
  };
}

/** Tendencia (media 7 días) en una fecha concreta, usando los registros hasta ese día. */
export function trendAt(entries: WeightEntry[], date: string): number | null {
  return currentTrend(
    entries.filter((e) => e.date <= date),
    date,
  ) ?? [...entries].filter((e) => e.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg ?? null;
}

/** Peso con el que rellenar el registro rápido: el de hoy si existe; si no, el último. */
export function prefillWeight(entries: WeightEntry[], today: string): { value: number | null; isToday: boolean } {
  const todayEntry = entries.find((e) => e.date === today);
  if (todayEntry) return { value: todayEntry.weightKg, isToday: true };
  const last = [...entries].filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { value: last?.weightKg ?? null, isToday: false };
}

// ───────────── Medidas ─────────────

export const MEASUREMENT_FIELDS = [
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'chestCm', label: 'Pecho', unit: 'cm' },
  { key: 'armCm', label: 'Brazo', unit: 'cm' },
  { key: 'thighCm', label: 'Muslo', unit: 'cm' },
  { key: 'hipCm', label: 'Cadera', unit: 'cm' },
  { key: 'bodyFatPct', label: '% grasa', unit: '%' },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];
export type MeasurementRow = { date: string } & Partial<Record<MeasurementKey, number | null>>;

/** Último valor de cada medida y su cambio respecto al primero registrado. */
export function measurementSummary(rows: MeasurementRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const out = {} as Record<MeasurementKey, { last: number; lastDate: string; first: number; change: number } | null>;
  for (const f of MEASUREMENT_FIELDS) {
    const vals = sorted.filter((r) => r[f.key] != null);
    if (!vals.length) {
      out[f.key] = null;
      continue;
    }
    const first = vals[0][f.key]!;
    const last = vals[vals.length - 1][f.key]!;
    out[f.key] = { last, lastDate: vals[vals.length - 1].date, first, change: last - first };
  }
  return out;
}

/** Valor de una medida en (o antes de) una fecha. */
export function measurementAt(rows: MeasurementRow[], key: MeasurementKey, date: string): number | null {
  const r = [...rows]
    .filter((x) => x.date <= date && x[key] != null)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return r?.[key] ?? null;
}

// ───────────── Fotos ─────────────

export type PhotoView = 'frontal' | 'lateral' | 'espalda';
export const PHOTO_VIEWS: { value: PhotoView; label: string }[] = [
  { value: 'frontal', label: 'Frontal' },
  { value: 'lateral', label: 'Lateral' },
  { value: 'espalda', label: 'Espalda' },
];

export interface PhotoLike {
  id: number;
  date: string;
  view: PhotoView;
  fileName: string;
}

export interface PhotoDay<P extends PhotoLike = PhotoLike> {
  date: string;
  views: Partial<Record<PhotoView, P>>;
}

/** Agrupa fotos por fecha (más reciente primero). Si hay varias de la misma vista y día, gana la última. */
export function groupPhotosByDate<P extends PhotoLike>(photos: P[]): PhotoDay<P>[] {
  const map = new Map<string, PhotoDay<P>>();
  for (const p of [...photos].sort((a, b) => a.id - b.id)) {
    const day = map.get(p.date) ?? { date: p.date, views: {} };
    day.views[p.view] = p;
    map.set(p.date, day);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Fechas por defecto para comparar: la más antigua y la más reciente que tengan la vista. */
export function defaultComparison(days: PhotoDay[], view: PhotoView): [string | null, string | null] {
  const withView = days.filter((d) => d.views[view]).map((d) => d.date).sort();
  const dates = withView.length >= 2 ? withView : days.map((d) => d.date).sort();
  if (!dates.length) return [null, null];
  return [dates[0], dates[dates.length - 1]];
}
