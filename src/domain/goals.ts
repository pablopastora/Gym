import { addDays, diffDays } from './dates';

/** Ritmo recomendado de pérdida de peso (kg/semana). */
export const RECOMMENDED_RATE = { min: 0.5, max: 0.75 } as const;

export type PaceStatus =
  | 'sin_objetivo'
  | 'alcanzado'
  | 'fecha_pasada'
  | 'lento'
  | 'recomendado'
  | 'agresivo'
  | 'muy_agresivo'
  | 'ganancia';

export interface GoalPace {
  status: PaceStatus;
  /** kg por semana necesarios (positivo = perder). */
  requiredKgPerWeek: number | null;
  weeksLeft: number | null;
  kgToGo: number | null;
  message: string;
}

/**
 * Evalúa si el objetivo marcado es realista.
 * - > 0,75 kg/sem → agresivo (riesgo de perder músculo en recomposición).
 * - > 1 % del peso corporal por semana → muy agresivo.
 * - < 0,25 kg/sem → lento (válido, pero la recomposición será más lenta en báscula).
 */
export function evaluateGoal(params: {
  currentKg: number;
  goalKg: number | null | undefined;
  goalDate: string | null | undefined;
  today: string;
}): GoalPace {
  const { currentKg, goalKg, goalDate, today } = params;
  if (goalKg == null || !goalDate) {
    return {
      status: 'sin_objetivo',
      requiredKgPerWeek: null,
      weeksLeft: null,
      kgToGo: null,
      message: 'Marca un peso y una fecha objetivo para calcular tu ritmo.',
    };
  }
  const kgToGo = currentKg - goalKg;
  const days = diffDays(today, goalDate);
  if (kgToGo <= 0) {
    return {
      status: kgToGo < -0.05 ? 'ganancia' : 'alcanzado',
      requiredKgPerWeek: null,
      weeksLeft: days / 7,
      kgToGo,
      message:
        kgToGo < -0.05
          ? 'El objetivo está por encima de tu peso actual: esta app está pensada para perder grasa.'
          : '¡Objetivo alcanzado! Puedes marcar uno nuevo o pasar a mantenimiento.',
    };
  }
  if (days <= 0) {
    return {
      status: 'fecha_pasada',
      requiredKgPerWeek: null,
      weeksLeft: 0,
      kgToGo,
      message: 'La fecha objetivo ya ha pasado. Elige una fecha nueva.',
    };
  }
  const weeks = days / 7;
  const rate = kgToGo / weeks;
  const pctBw = rate / currentKg;
  let status: PaceStatus;
  let message: string;
  if (pctBw > 0.01) {
    status = 'muy_agresivo';
    message = `Necesitarías perder ${rate.toFixed(2).replace('.', ',')} kg/semana (más del 1 % de tu peso). Es muy agresivo: perderás músculo y rendimiento. Alarga la fecha.`;
  } else if (rate > RECOMMENDED_RATE.max) {
    status = 'agresivo';
    message = `Necesitarías ${rate.toFixed(2).replace('.', ',')} kg/semana. Es más rápido de lo recomendado (0,5-0,75) para conservar músculo.`;
  } else if (rate >= RECOMMENDED_RATE.min) {
    status = 'recomendado';
    message = `Ritmo de ${rate.toFixed(2).replace('.', ',')} kg/semana: dentro del rango recomendado.`;
  } else {
    status = 'lento';
    message = `Ritmo de ${rate.toFixed(2).replace('.', ',')} kg/semana: cómodo y sostenible, aunque más lento de lo habitual.`;
  }
  return { status, requiredKgPerWeek: rate, weeksLeft: weeks, kgToGo, message };
}

/** Fechas sugeridas para llegar al objetivo a 0,75 y 0,5 kg/semana. */
export function suggestedGoalDates(currentKg: number, goalKg: number, today: string) {
  const kg = Math.max(0, currentKg - goalKg);
  return {
    fast: addDays(today, Math.ceil((kg / RECOMMENDED_RATE.max) * 7)),
    slow: addDays(today, Math.ceil((kg / RECOMMENDED_RATE.min) * 7)),
  };
}

export type OnTrack = 'en_ritmo' | 'por_detras' | 'demasiado_rapido' | 'sin_datos';

/** Compara el cambio semanal real con el requerido. */
export function onTrack(weeklyChangeKg: number | null, requiredKgPerWeek: number | null): OnTrack {
  if (weeklyChangeKg == null || requiredKgPerWeek == null) return 'sin_datos';
  const lost = -weeklyChangeKg;
  if (lost > Math.max(1, requiredKgPerWeek * 1.6)) return 'demasiado_rapido';
  if (lost >= requiredKgPerWeek * 0.8) return 'en_ritmo';
  return 'por_detras';
}
