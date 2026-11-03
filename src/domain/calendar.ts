import { addDays, parseISODate, startOfWeek, toISODate } from './dates';

export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const WEEKDAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Semanas (lunes-domingo) que cubren el mes; los días de otros meses son null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = toISODate(new Date(year, month, 1));
  const last = toISODate(new Date(year, month + 1, 0));
  const weeks: (string | null)[][] = [];
  let d = startOfWeek(first);
  while (d <= last) {
    const week: (string | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(d, i);
      week.push(day >= first && day <= last ? day : null);
    }
    weeks.push(week);
    d = addDays(d, 7);
  }
  return weeks;
}

export function monthTitle(year: number, month: number) {
  const m = MONTHS[month];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

export function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const d = new Date(year, month + delta, 1);
  return [d.getFullYear(), d.getMonth()];
}

export function dayOfMonth(date: string) {
  return parseISODate(date).getDate();
}

/** Nuestro día (1 = lunes … 7 = domingo) → el de expo-notifications (1 = domingo … 7 = sábado). */
export function toExpoWeekday(weekday: number): number {
  return (weekday % 7) + 1;
}
