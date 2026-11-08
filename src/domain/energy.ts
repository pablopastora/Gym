/**
 * Gasto energético y objetivo calórico (estimaciones, no consejo médico).
 *
 * - Basal (BMR): Mifflin-St Jeor.
 *     hombre: 10·kg + 6,25·cm − 5·edad + 5
 *     mujer:  10·kg + 6,25·cm − 5·edad − 161
 * - Gasto del día = BMR × factor de actividad (fuera del ejercicio) + ejercicio neto.
 *   El ejercicio se suma en NETO: a sus kcal brutas se les resta lo que ya cuenta el
 *   factor de actividad durante esos minutos, para no contarlo dos veces.
 * - Objetivo = gasto esperado − déficit (ritmo × 7700 / 7), con déficit ≤ 25 % del
 *   gasto y suelo de seguridad max(BMR, 1500).
 */
import { addDays, diffDays } from './dates';

export type Sex = 'hombre' | 'mujer';
export type ActivityLevel = 'sedentario' | 'ligero' | 'activo';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = { sedentario: 1.2, ligero: 1.3, activo: 1.45 };
export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentario: { label: 'Sedentario', hint: 'Trabajo sentado, pocos pasos (< 5.000/día). Factor 1,2.' },
  ligero: { label: 'Ligero', hint: 'Algo de movimiento: 5.000-9.000 pasos/día. Factor 1,3.' },
  activo: { label: 'Activo', hint: 'De pie o caminando mucho: > 10.000 pasos/día. Factor 1,45.' },
};

/** kcal aproximadas por kg de grasa corporal. */
export const KCAL_PER_KG = 7700;
export const MIN_TARGET_KCAL = 1500;
export const MAX_DEFICIT_FRACTION = 0.25;
export const DEFAULT_RATE_KG_WEEK = 0.5;

export function bmrMifflin(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'hombre' ? 5 : -161);
}

/** Datos del perfil que faltan para calcular el basal (sin inventar valores). */
export function missingForBmr(p: { age: number | null; sex: Sex | null }): ('edad' | 'sexo')[] {
  const out: ('edad' | 'sexo')[] = [];
  if (p.age == null) out.push('edad');
  if (!p.sex) out.push('sexo');
  return out;
}

export interface ActivityItem {
  kcal: number;
  /** MET de la actividad; si falta se asume 5. */
  met: number | null;
}

/**
 * Kcal netas del ejercicio: brutas − lo que el factor de actividad ya asigna a esos minutos.
 * minutos ≈ kcal × 60 / (MET × kg); base por minuto = BMR × factor / 1440.
 */
export function netExerciseKcal(items: ActivityItem[], baselinePerMin: number, weightKg: number): number {
  let total = 0;
  for (const it of items) {
    if (!it.kcal || it.kcal <= 0) continue;
    const met = it.met && it.met > 0 ? it.met : 5;
    const minutes = (it.kcal * 60) / (met * weightKg);
    total += Math.max(0, it.kcal - minutes * baselinePerMin);
  }
  return total;
}

export interface DayExpenditure {
  bmr: number;
  /** Actividad diaria fuera del ejercicio: BMR × (factor − 1). */
  neat: number;
  /** Kcal brutas de entrenos y cardio (las que se muestran en cada registro). */
  exerciseGross: number;
  /** Kcal netas del ejercicio (las que se suman al gasto). */
  exerciseNet: number;
  /** Recalibración aceptada (positiva o negativa). */
  adjust: number;
  total: number;
}

export function dailyExpenditure(p: { bmr: number; factor: number; weightKg: number; items: ActivityItem[]; adjust?: number }): DayExpenditure {
  const base = p.bmr * p.factor;
  const exerciseNet = netExerciseKcal(p.items, base / 1440, p.weightKg);
  const exerciseGross = p.items.reduce((a, i) => a + Math.max(0, i.kcal), 0);
  const adjust = p.adjust ?? 0;
  return { bmr: p.bmr, neat: base - p.bmr, exerciseGross, exerciseNet, adjust, total: base + exerciseNet + adjust };
}

/** Ritmo por defecto según el objetivo (entre 0,5 y 0,75 kg/sem); sin objetivo, 0,5. */
export function defaultRate(requiredKgPerWeek: number | null): number {
  if (requiredKgPerWeek == null || requiredKgPerWeek <= 0) return DEFAULT_RATE_KG_WEEK;
  return Math.min(0.75, Math.max(0.5, Math.round(requiredKgPerWeek * 20) / 20));
}

export function deficitForRate(rateKgWeek: number): number {
  return (rateKgWeek * KCAL_PER_KG) / 7;
}

export interface CalorieTarget {
  /** Objetivo que usa la app (el manual si lo hay). */
  targetKcal: number;
  /** Gasto esperado de un día medio. */
  expectedTdee: number;
  deficitKcal: number;
  /** El déficit pedido superaba el 25 % del gasto y se ha limitado. */
  cappedDeficit: boolean;
  floorKcal: number;
  /** El objetivo calculado quedaba por debajo del suelo y se ha subido. */
  raisedToFloor: boolean;
  /** El objetivo manual está por debajo del suelo: se avisa y se propone `suggestedKcal`. */
  manualBelowFloor: boolean;
  suggestedKcal: number;
  /** Pérdida semanal esperada con este objetivo (kg/sem). */
  expectedRateKgWeek: number;
  isManual: boolean;
}

export function calorieTarget(p: { expectedTdee: number; bmr: number; rateKgWeek: number; manualKcal?: number | null }): CalorieTarget {
  const floorKcal = Math.round(Math.max(p.bmr, MIN_TARGET_KCAL));
  const wanted = deficitForRate(p.rateKgWeek);
  const maxDeficit = p.expectedTdee * MAX_DEFICIT_FRACTION;
  const deficit = Math.min(wanted, maxDeficit);
  const auto = p.expectedTdee - deficit;
  const raisedToFloor = auto < floorKcal;
  const suggested = Math.round(Math.max(auto, floorKcal) / 10) * 10;
  const isManual = p.manualKcal != null && p.manualKcal > 0;
  const target = isManual ? p.manualKcal! : suggested;
  return {
    targetKcal: target,
    expectedTdee: p.expectedTdee,
    deficitKcal: Math.max(0, p.expectedTdee - target),
    cappedDeficit: wanted > maxDeficit,
    floorKcal,
    raisedToFloor: !isManual && raisedToFloor,
    manualBelowFloor: isManual && target < floorKcal,
    suggestedKcal: suggested,
    expectedRateKgWeek: Math.max(0, ((p.expectedTdee - target) * 7) / KCAL_PER_KG),
    isManual,
  };
}

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** No caben los hidratos (proteína + grasa ya superan el objetivo). */
  tight: boolean;
}

export const DEFAULT_PROTEIN_G_KG = 2.0;
export const DEFAULT_FAT_G_KG = 0.7;

/** Proteína y grasa por kg; el resto de kcal, hidratos. */
export function macroTargets(p: { kcal: number; weightKg: number; proteinGPerKg: number; fatGPerKg: number }): MacroTargets {
  const proteinG = Math.round(p.proteinGPerKg * p.weightKg);
  const fatG = Math.round(p.fatGPerKg * p.weightKg);
  const rest = p.kcal - proteinG * 4 - fatG * 9;
  return { proteinG, fatG, carbsG: Math.max(0, Math.round(rest / 4)), tight: rest < 0 };
}

export function kcalFromMacros(m: { protein: number; carbs: number; fat: number }) {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}

// ---------- Ajuste adaptativo ----------

export interface AdaptiveDay {
  date: string;
  /** kcal ingeridas registradas (null = día sin registro). */
  intakeKcal: number | null;
  /** Gasto estimado por la app ese día (sin la recalibración). */
  estimatedKcal: number;
}

export interface AdaptiveSuggestion {
  fromDate: string;
  toDate: string;
  loggedDays: number;
  avgIntake: number;
  avgEstimated: number;
  /** Cambio de la media de 7 días entre el principio y el final del periodo. */
  weightChangeKg: number;
  /** Gasto que explica el cambio de peso real. */
  observedTdee: number;
  /** Diferencia observada − estimada (ya limitada). */
  deltaKcal: number;
}

export const ADAPTIVE_WINDOW_DAYS = 21;
export const ADAPTIVE_MIN_LOGGED = 14;
export const ADAPTIVE_MIN_DELTA = 100;
export const ADAPTIVE_MAX_STEP = 300;

function avgWeight(weights: { date: string; weightKg: number }[], from: string, to: string): number | null {
  const w = weights.filter((x) => x.date >= from && x.date <= to);
  if (w.length < 3) return null;
  return w.reduce((a, x) => a + x.weightKg, 0) / w.length;
}

/**
 * Compara el cambio de peso real (media de 7 días al principio y al final de las
 * últimas 3 semanas) con el que predice el balance entre lo comido y el gasto
 * estimado. Necesita ≥ 14 días con ingesta registrada y ≥ 3 pesajes en cada extremo.
 * Devuelve la recalibración propuesta del gasto (o null si no hace falta o no hay datos).
 */
export function adaptiveSuggestion(p: { today: string; days: AdaptiveDay[]; weights: { date: string; weightKg: number }[] }): AdaptiveSuggestion | null {
  const toDate = addDays(p.today, -1);
  const fromDate = addDays(toDate, -(ADAPTIVE_WINDOW_DAYS - 1));
  const days = p.days.filter((d) => d.date >= fromDate && d.date <= toDate);
  const logged = days.filter((d) => d.intakeKcal != null && d.intakeKcal > 0);
  if (logged.length < ADAPTIVE_MIN_LOGGED) return null;
  const startAvg = avgWeight(p.weights, fromDate, addDays(fromDate, 6));
  const endAvg = avgWeight(p.weights, addDays(toDate, -6), toDate);
  if (startAvg == null || endAvg == null) return null;
  const span = diffDays(addDays(fromDate, 3), addDays(toDate, -3)); // entre los centros de las dos medias
  const avgIntake = logged.reduce((a, d) => a + d.intakeKcal!, 0) / logged.length;
  const avgEstimated = logged.reduce((a, d) => a + d.estimatedKcal, 0) / logged.length;
  const change = endAvg - startAvg;
  const observedTdee = avgIntake - (change * KCAL_PER_KG) / span;
  const raw = observedTdee - avgEstimated;
  if (Math.abs(raw) < ADAPTIVE_MIN_DELTA) return null;
  const delta = Math.round(Math.max(-ADAPTIVE_MAX_STEP, Math.min(ADAPTIVE_MAX_STEP, raw)) / 10) * 10;
  return {
    fromDate,
    toDate,
    loggedDays: logged.length,
    avgIntake: Math.round(avgIntake),
    avgEstimated: Math.round(avgEstimated),
    weightChangeKg: Math.round(change * 100) / 100,
    observedTdee: Math.round(observedTdee),
    deltaKcal: delta,
  };
}

// ---------- Ingestas muy bajas ----------

/**
 * Días seguidos (hasta ayer) con ingesta registrada muy baja: < max(1200, 75 % del suelo).
 * Los días sin ningún registro cortan la racha (no se sabe qué se comió).
 */
export function lowIntakeStreak(p: { today: string; intakeByDate: Map<string, number>; floorKcal: number }): number {
  const threshold = Math.max(1200, p.floorKcal * 0.75);
  let streak = 0;
  for (let d = addDays(p.today, -1); ; d = addDays(d, -1)) {
    const kcal = p.intakeByDate.get(d);
    if (kcal == null || kcal <= 0 || kcal >= threshold) break;
    streak++;
    if (streak > 60) break;
  }
  return streak;
}

export const LOW_INTAKE_DAYS = 3;

export const ENERGY_EXPLANATION =
  'Basal (Mifflin-St Jeor) con tu último peso, tu altura, edad y sexo.\n\n' +
  'Gasto del día = basal × factor de actividad (fuera del ejercicio) + ejercicio neto. ' +
  'Del ejercicio solo se suma lo que va por encima de lo que ya cuenta el factor en esos minutos, para no contarlo dos veces.\n\n' +
  'Objetivo = gasto de un día medio (con tu ejercicio de las 2 últimas semanas) − déficit. ' +
  'El déficit sale de tu ritmo (0,5 kg/sem ≈ 550 kcal/día), nunca más del 25 % del gasto, ' +
  'y el objetivo nunca baja de tu basal ni de 1.500 kcal.\n\n' +
  'Son estimaciones (±10-20 %), no consejo médico ni nutricional personalizado. Con 2-3 semanas de registros la app puede proponerte recalibrar el gasto según cómo cambia tu peso.';
