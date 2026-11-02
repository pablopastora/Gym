import type { RecordType, SetType } from '@/db/schema';

import { fmtNum } from './format';
import { estimated1RM, setVolume } from './oneRm';

export interface RecSet {
  weightKg: number | null;
  reps: number | null;
  setType: SetType;
}

export interface RecSession {
  workoutId: number;
  date: string;
  sets: RecSet[];
}

export interface SessionBests {
  maxWeight: number | null;
  /** Reps hechas con el peso máximo (para mostrar «100 kg × 3»). */
  maxWeightReps: number | null;
  bestE1rm: number | null;
  volume: number;
}

const counts = (s: RecSet) => s.setType !== 'calentamiento' && s.reps != null && s.reps > 0;

export function sessionBests(sets: RecSet[]): SessionBests {
  const valid = sets.filter(counts);
  let maxWeight: number | null = null;
  let maxWeightReps: number | null = null;
  let bestE1rm: number | null = null;
  for (const s of valid) {
    if (s.weightKg != null && s.weightKg > 0 && (maxWeight == null || s.weightKg > maxWeight || (s.weightKg === maxWeight && (s.reps ?? 0) > (maxWeightReps ?? 0)))) {
      maxWeight = s.weightKg;
      maxWeightReps = s.reps;
    }
    const e = estimated1RM(s.weightKg, s.reps);
    if (e != null && (bestE1rm == null || e > bestE1rm)) bestE1rm = e;
  }
  return { maxWeight, maxWeightReps, bestE1rm, volume: valid.reduce((a, s) => a + setVolume(s.weightKg, s.reps), 0) };
}

export interface RecordValue {
  value: number;
  date: string;
  workoutId: number;
  detail: string;
}

export interface ExerciseRecords {
  peso_max: RecordValue | null;
  e1rm: RecordValue | null;
  volumen: RecordValue | null;
}

export interface HistoryPoint extends SessionBests {
  workoutId: number;
  date: string;
  /** Récords batidos en esta sesión (la primera sesión no cuenta como récord). */
  records: RecordType[];
}

/** Recorre las sesiones en orden y devuelve los récords vigentes y los batidos en cada sesión. */
export function computeRecords(sessions: RecSession[]): { records: ExerciseRecords; history: HistoryPoint[] } {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.workoutId - b.workoutId);
  const rec: ExerciseRecords = { peso_max: null, e1rm: null, volumen: null };
  const history: HistoryPoint[] = [];
  for (const s of sorted) {
    const b = sessionBests(s.sets);
    if (b.volume === 0 && b.maxWeight == null && b.bestE1rm == null) continue;
    const beaten: RecordType[] = [];
    const tryRec = (type: RecordType, value: number | null, detail: string) => {
      if (value == null || value <= 0) return;
      const cur = rec[type];
      if (!cur || value > cur.value + 1e-9) {
        // La primera sesión establece la base: no cuenta como «récord batido».
        if (cur) beaten.push(type);
        rec[type] = { value, date: s.date, workoutId: s.workoutId, detail };
      }
    };
    tryRec('peso_max', b.maxWeight, `${fmtNum(b.maxWeight, 2)} kg × ${b.maxWeightReps}`);
    tryRec('e1rm', b.bestE1rm, '');
    tryRec('volumen', b.volume, '');
    history.push({ workoutId: s.workoutId, date: s.date, ...b, records: beaten });
  }
  return { records: rec, history };
}

/** ¿Esta serie bate el mejor peso o el mejor 1RM estimado previos? (aviso en directo) */
export function setBeatsRecord(
  set: { weightKg: number | null; reps: number | null },
  prev: { maxWeight: number | null; bestE1rm: number | null } | null,
): RecordType[] {
  if (!prev || (prev.maxWeight == null && prev.bestE1rm == null)) return [];
  const out: RecordType[] = [];
  if (set.weightKg != null && prev.maxWeight != null && set.weightKg > prev.maxWeight) out.push('peso_max');
  const e = estimated1RM(set.weightKg, set.reps);
  if (e != null && prev.bestE1rm != null && e > prev.bestE1rm + 1e-9) out.push('e1rm');
  return out;
}

export const RECORD_LABELS: Record<RecordType, string> = {
  peso_max: 'Peso máximo',
  e1rm: '1RM estimado',
  volumen: 'Volumen en una sesión',
};
