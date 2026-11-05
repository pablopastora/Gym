/**
 * Doble progresión adaptada a recomposición en déficit.
 *
 * Reglas:
 *  1. Todas las series de trabajo en el techo del rango → subir carga
 *     (+incremento superior/inferior) y volver al suelo del rango.
 *  2. Modo déficit: si la pierna llegó al techo «justa» (RIR 0, RPE ≥ 9,5 o
 *     serie al fallo), sube el incremento pequeño. Y nunca dos subidas seguidas:
 *     si la sesión anterior ya fue la primera con un peso nuevo, se consolida.
 *  3. Si una serie no llega al mínimo → se MANTIENE la carga (nunca se baja
 *     por una mala sesión).
 *  4. 3 sesiones seguidas sin progresar → se SUGIERE bajar un 10 % o cambiar
 *     el ejercicio (la decisión es del usuario).
 */
import type { BodyRegion, ProgressionAction, SetType } from '@/db/schema';

import { fmtNum } from './format';
import { roundTo } from './workout';

export const STALL_SESSIONS = 3;

export interface HistSet {
  weightKg: number | null;
  reps: number | null;
  rir?: number | null;
  rpe?: number | null;
  setType: SetType;
}

export interface HistSession {
  date: string;
  sets: HistSet[];
}

export interface ProgressionConfig {
  sets: number;
  repMin: number;
  repMax: number;
  region: BodyRegion;
  incUpper: number;
  incLower: number;
  deficitMode: boolean;
}

export interface Suggestion {
  action: ProgressionAction;
  /** Peso propuesto para las series de trabajo (null = sin peso / por definir). */
  weightKg: number | null;
  deltaKg: number;
  /** Reps con las que se rellena cada serie (null = usar las de la última vez). */
  reps: number | null;
  /** Peso alternativo sugerido (−10 % al estancarse). */
  altWeightKg?: number;
  stallCount: number;
  note: string;
}

const isWorking = (s: HistSet) => s.setType === 'normal' || s.setType === 'fallo';
const kg = (n: number) => `${fmtNum(n, 2)} kg`;

export interface SessionStats {
  /** Peso de trabajo: el más repetido (empate → el mayor). null = peso corporal. */
  weight: number | null;
  repsAtWeight: number[];
  totalRepsAtWeight: number;
  allAtTop: boolean;
  anyBelowMin: boolean;
  /** Alguna serie al límite (RIR 0, RPE ≥ 9,5 o marcada al fallo). */
  hard: boolean;
}

export function sessionStats(session: HistSession, cfg: Pick<ProgressionConfig, 'sets' | 'repMin' | 'repMax'>): SessionStats {
  const sets = session.sets.filter((s) => isWorking(s) && s.reps != null);
  const counts = new Map<number, number>();
  for (const s of sets) if (s.weightKg && s.weightKg > 0) counts.set(s.weightKg, (counts.get(s.weightKg) ?? 0) + 1);
  let weight: number | null = null;
  let best = 0;
  for (const [w, c] of counts) {
    if (c > best || (c === best && weight != null && w > weight)) {
      weight = w;
      best = c;
    }
  }
  const atWeight = weight == null ? sets : sets.filter((s) => s.weightKg === weight);
  const reps = atWeight.map((s) => s.reps ?? 0);
  return {
    weight,
    repsAtWeight: reps,
    totalRepsAtWeight: reps.reduce((a, b) => a + b, 0),
    allAtTop: reps.length >= cfg.sets && reps.every((r) => r >= cfg.repMax),
    anyBelowMin: sets.some((s) => (s.reps ?? 0) < cfg.repMin),
    hard: sets.some((s) => s.rir === 0 || (s.rpe != null && s.rpe >= 9.5) || s.setType === 'fallo'),
  };
}

/** ¿Hubo progreso de `prev` a `cur`? (más peso, más reps al mismo peso, o techo alcanzado) */
export function progressed(prev: SessionStats, cur: SessionStats): boolean {
  const pw = prev.weight ?? 0;
  const cw = cur.weight ?? 0;
  if (cw !== pw) return true; // cambio de carga (subida o bajada voluntaria) → nueva referencia
  return cur.totalRepsAtWeight > prev.totalRepsAtWeight || cur.allAtTop;
}

/** Sesiones consecutivas al final del historial sin progreso. */
export function stallCount(history: HistSession[], cfg: ProgressionConfig): number {
  const stats = history.map((h) => sessionStats(h, cfg));
  let n = 0;
  for (let i = stats.length - 1; i > 0; i--) {
    if (progressed(stats[i - 1], stats[i])) break;
    n++;
  }
  return n;
}

/** Sugerencia para la próxima sesión. `history` en orden cronológico (sin descargas). */
export function suggestProgression(history: HistSession[], cfg: ProgressionConfig): Suggestion {
  if (!history.length) {
    return {
      action: 'primera_vez',
      weightKg: null,
      deltaKg: 0,
      reps: null,
      stallCount: 0,
      note: `Primera vez: elige un peso con el que hagas ${cfg.repMin}-${cfg.repMax} reps dejando 1-2 en reserva.`,
    };
  }
  const last = sessionStats(history[history.length - 1], cfg);
  const prev = history.length >= 2 ? sessionStats(history[history.length - 2], cfg) : null;
  const stalls = stallCount(history, cfg);

  if (last.weight == null) {
    if (last.allAtTop) {
      return {
        action: 'lastre',
        weightKg: null,
        deltaKg: 0,
        reps: null,
        stallCount: 0,
        note: `Llegas a ${cfg.repMax} reps en todas las series: añade lastre o sube el rango.`,
      };
    }
    return {
      action: stalls >= STALL_SESSIONS ? 'estancado' : 'mantener',
      weightKg: null,
      deltaKg: 0,
      reps: null,
      stallCount: stalls,
      note:
        stalls >= STALL_SESSIONS
          ? `${stalls} sesiones sin progresar: prueba una variante más fácil o sustituye el ejercicio.`
          : `Objetivo: sumar 1 rep hasta llegar a ${cfg.repMax} en todas las series.`,
    };
  }

  if (last.allAtTop) {
    const justIncreased = prev?.weight != null && last.weight > prev.weight;
    if (cfg.deficitMode && justIncreased) {
      return {
        action: 'consolidar',
        weightKg: last.weight,
        deltaKg: 0,
        reps: null,
        stallCount: 0,
        note: `Primera sesión con ${kg(last.weight)} y ya llegas al techo: consolídalo una sesión más antes de subir (modo déficit).`,
      };
    }
    let inc = cfg.region === 'inferior' ? cfg.incLower : cfg.incUpper;
    let reason = '';
    if (cfg.deficitMode && cfg.region === 'inferior' && last.hard && cfg.incUpper < inc) {
      inc = cfg.incUpper;
      reason = ' (subida prudente: la última sesión fue al límite)';
    }
    return {
      action: 'subir',
      weightKg: last.weight + inc,
      deltaKg: inc,
      reps: cfg.repMin,
      stallCount: 0,
      note: `¡${cfg.repMax} reps en todas las series! Sube a ${kg(last.weight + inc)}${reason} y vuelve a ${cfg.repMin} reps.`,
    };
  }

  if (stalls >= STALL_SESSIONS) {
    const alt = Math.max(0, roundTo(last.weight * 0.9, 2.5));
    return {
      action: 'estancado',
      weightKg: last.weight,
      deltaKg: 0,
      reps: null,
      altWeightKg: alt,
      stallCount: stalls,
      note: `${stalls} sesiones sin progresar con ${kg(last.weight)}. Te sugerimos bajar un 10 % (${kg(alt)}) y volver a subir, o cambiar el ejercicio.`,
    };
  }

  return {
    action: 'mantener',
    weightKg: last.weight,
    deltaKg: 0,
    reps: null,
    stallCount: stalls,
    note: last.anyBelowMin
      ? `Alguna serie no llegó a ${cfg.repMin} reps: mantén ${kg(last.weight)}. Un mal día no baja el peso.`
      : `Mantén ${kg(last.weight)} y suma 1 rep donde puedas hasta llegar a ${cfg.repMax} en todas.`,
  };
}

// ───────────── Semana de descarga ─────────────

export type DeloadState = 'activa' | 'recomendada' | 'sugerida' | 'no';

export interface DeloadInput {
  today: string;
  /** Inicio de la referencia: última descarga o primer entreno. */
  sinceDate: string | null;
  deloadUntil: string | null;
  snoozeUntil: string | null;
  /** Proporción de ejercicios recientes con ≥ 2 sesiones sin progreso. */
  stalledRatio: number;
  stalledExercises: number;
  /** RIR medio de las series de los últimos 7 días (null si no se registró). */
  avgRirLastWeek: number | null;
  /** Semana del mesociclo del plan automático (null si está desactivado). */
  mesoWeek?: number | null;
}

export function deloadStatus(i: DeloadInput, diffDays: (a: string, b: string) => number) {
  if (i.deloadUntil && i.deloadUntil >= i.today) return { state: 'activa' as DeloadState, weeks: 0, reason: 'Semana de descarga en curso.' };
  if (!i.sinceDate) return { state: 'no' as DeloadState, weeks: 0, reason: '' };
  const weeks = Math.floor(diffDays(i.sinceDate, i.today) / 7);
  if (i.snoozeUntil && i.snoozeUntil > i.today) return { state: 'no' as DeloadState, weeks, reason: '' };
  if (i.mesoWeek === 4) return { state: 'recomendada' as DeloadState, weeks, reason: 'Semana 4 del mesociclo: toca descarga para recuperar y empezar el siguiente bloque.' };
  if (weeks >= 8) return { state: 'recomendada' as DeloadState, weeks, reason: `Llevas ${weeks} semanas sin descargar.` };
  if (i.stalledExercises >= 3 && i.stalledRatio >= 0.3)
    return {
      state: 'sugerida' as DeloadState,
      weeks,
      reason: `Fatiga acumulada: ${Math.round(i.stalledRatio * 100)} % de tus ejercicios llevan 2+ sesiones sin progresar.`,
    };
  if (i.avgRirLastWeek != null && i.avgRirLastWeek <= 0.5 && weeks >= 3)
    return { state: 'sugerida' as DeloadState, weeks, reason: 'Esta semana casi todas tus series han ido al fallo (RIR ≈ 0).' };
  if (weeks >= 6) return { state: 'sugerida' as DeloadState, weeks, reason: `Llevas ${weeks} semanas entrenando sin descarga.` };
  return { state: 'no' as DeloadState, weeks, reason: '' };
}

/** Series durante la descarga: la mitad (redondeando hacia arriba). */
export const deloadSets = (sets: number) => Math.max(1, Math.ceil(sets / 2));
