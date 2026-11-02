import { addDays, startOfWeek } from '../dates';
import { nextRoutineDay, weekStreak } from '../schedule';

const days = [
  { id: 1, sortOrder: 0, isOptional: false },
  { id: 2, sortOrder: 1, isOptional: false },
  { id: 3, sortOrder: 2, isOptional: false },
  { id: 4, sortOrder: 3, isOptional: false },
  { id: 5, sortOrder: 4, isOptional: true },
];

describe('siguiente día de rutina', () => {
  it('empieza por el día 1', () => expect(nextRoutineDay(days, null, 4)?.id).toBe(1));
  it('avanza en orden', () => expect(nextRoutineDay(days, 2, 4)?.id).toBe(3));
  it('con 4 días salta el opcional y vuelve al 1', () => expect(nextRoutineDay(days, 4, 4)?.id).toBe(1));
  it('con 5 días incluye el opcional', () => expect(nextRoutineDay(days, 4, 5)?.id).toBe(5));
  it('tras el opcional vuelve al 1', () => expect(nextRoutineDay(days, 5, 5)?.id).toBe(1));
  it('día desconocido → primero', () => expect(nextRoutineDay(days, 99, 4)?.id).toBe(1));
  it('sin días → null', () => expect(nextRoutineDay([], null, 4)).toBeNull());
});

describe('racha semanal', () => {
  const s = (dates: string[], today: string, target = 4) => weekStreak(dates, today, target, startOfWeek, addDays);
  const week = (monday: string, n: number) => Array.from({ length: n }, (_, i) => addDays(monday, i));
  it('cuenta semanas completas seguidas', () => {
    const dates = [...week('2026-10-19', 4), ...week('2026-10-26', 4)];
    expect(s(dates, '2026-11-03')).toBe(2); // semana actual sin cumplir aún: no rompe
  });
  it('la semana actual suma si ya se cumplió', () => {
    expect(s([...week('2026-10-26', 4), ...week('2026-11-02', 4)], '2026-11-06')).toBe(2);
  });
  it('una semana incompleta corta la racha', () => {
    expect(s([...week('2026-10-12', 4), ...week('2026-10-19', 2), ...week('2026-10-26', 5)], '2026-11-02')).toBe(1);
  });
  it('dos entrenos el mismo día cuentan como un día', () => {
    expect(s(['2026-10-26', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'], '2026-11-02')).toBe(1);
    expect(s(['2026-10-26', '2026-10-26', '2026-10-27', '2026-10-28'], '2026-11-02')).toBe(0);
  });
});
