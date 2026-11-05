/**
 * Plan de la semana: qué toca hoy, mañana y el resto de días, qué está hecho y
 * qué es descanso. Función pura: recibe la fecha de hoy (no la calcula).
 *
 * Reglas:
 *  - Los días de entreno son los días de la semana elegidos (por defecto según días/semana).
 *  - La rotación de la rutina continúa desde el último entreno terminado (aunque
 *    fuera ayer o hace días): saltarse un día no salta una sesión.
 *  - Si hoy ya hay un entreno terminado, hoy está «completado» y la siguiente
 *    sesión va al próximo día de entreno (etiquetado «Mañana» si es mañana).
 */
import { addDays, diffDays, parseISODate, startOfWeek } from './dates';
import { nextRoutineDay, type DayRef } from './schedule';

export const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** 1 = lunes … 7 = domingo. */
export function weekdayOf(date: string): number {
  return ((parseISODate(date).getDay() + 6) % 7) + 1;
}

/** Días de entreno por defecto según días/semana. */
export function defaultTrainingWeekdays(daysPerWeek: number): number[] {
  switch (Math.max(1, Math.min(7, daysPerWeek))) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [1, 2, 4, 5];
    case 5:
      return [1, 2, 3, 4, 5];
    case 6:
      return [1, 2, 3, 4, 5, 6];
    default:
      return [1, 2, 3, 4, 5, 6, 7];
  }
}

export function resolveTrainingWeekdays(p: { trainingWeekdays?: number[] | null; daysPerWeek: number }): number[] {
  const w = (p.trainingWeekdays ?? []).filter((d) => d >= 1 && d <= 7);
  return w.length ? [...new Set(w)].sort((a, b) => a - b) : defaultTrainingWeekdays(p.daysPerWeek);
}

export function dayLabel(date: string, today: string): string {
  const d = diffDays(today, date);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  // El resto (también los días pasados de la semana): nombre del día.
  return WEEKDAY_NAMES[weekdayOf(date) - 1];
}

export interface DoneWorkout {
  id: number;
  name: string;
  routineDayId: number | null;
  isDeload?: boolean;
}

export type PlanStatus =
  | 'completado' // hay entreno terminado ese día
  | 'pendiente' // hoy, día de entreno, sin hacer
  | 'programado' // futuro, día de entreno
  | 'descanso' // día de descanso
  | 'perdido'; // pasado, día de entreno sin entrenar

export interface PlanDay<D extends DayRef> {
  date: string;
  label: string;
  isToday: boolean;
  status: PlanStatus;
  workouts: DoneWorkout[];
  /** Sesión de la rutina prevista (pendiente o programada). */
  session: D | null;
}

export interface WeekPlan<D extends DayRef> {
  today: string;
  days: PlanDay<D>[];
  todayEntry: PlanDay<D>;
  /** Próxima sesión por hacer (hoy si está pendiente; si no, la siguiente programada). */
  next: PlanDay<D> | null;
  /** Sesión que se haría si se entrena ahora (para «Empezar otra sesión» o «Adelantar»). */
  nextSessionNow: D | null;
}

export function buildWeekPlan<D extends DayRef>(input: {
  today: string;
  trainingWeekdays: number[];
  routineDays: D[];
  daysPerWeek: number;
  /** Día de rutina del último entreno terminado (cualquier fecha). */
  lastDoneDayId: number | null;
  doneByDate: Map<string, DoneWorkout[]>;
  /** Cambios puntuales: fecha → día de entreno (true) o de descanso (false). */
  overrides?: Map<string, boolean>;
}): WeekPlan<D> {
  const { today, routineDays, daysPerWeek, doneByDate } = input;
  const training = new Set(input.trainingWeekdays);
  const start = startOfWeek(today);
  const end = addDays(start, 6) > addDays(today, 1) ? addDays(start, 6) : addDays(today, 1);

  let cursor = routineDays.length ? nextRoutineDay(routineDays, input.lastDoneDayId, daysPerWeek) : null;
  const nextSessionNow = cursor;
  const advance = () => {
    if (cursor) cursor = nextRoutineDay(routineDays, cursor.id, daysPerWeek);
  };

  const days: PlanDay<D>[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const workouts = doneByDate.get(d) ?? [];
    const isTraining = input.overrides?.get(d) ?? training.has(weekdayOf(d));
    const base = { date: d, label: dayLabel(d, today), isToday: d === today, workouts };
    if (d < today) {
      days.push({ ...base, status: workouts.length ? 'completado' : isTraining ? 'perdido' : 'descanso', session: null });
    } else if (d === today) {
      if (workouts.length) days.push({ ...base, status: 'completado', session: null });
      else if (isTraining && cursor) {
        days.push({ ...base, status: 'pendiente', session: cursor });
        advance();
      } else days.push({ ...base, status: 'descanso', session: null });
    } else if (isTraining && cursor) {
      days.push({ ...base, status: 'programado', session: cursor });
      advance();
    } else {
      days.push({ ...base, status: 'descanso', session: null });
    }
  }
  const todayEntry = days.find((x) => x.isToday)!;
  const next = days.find((x) => x.date >= today && (x.status === 'pendiente' || x.status === 'programado')) ?? null;
  return { today, days, todayEntry, next, nextSessionNow };
}

/** Siguiente día de descanso (sin entreno hecho) después de `date`, dentro del plan. */
export function nextFreeDay<D extends DayRef>(plan: WeekPlan<D>, date: string): string | null {
  return plan.days.find((d) => d.date > date && d.status === 'descanso' && !d.workouts.length)?.date ?? null;
}
