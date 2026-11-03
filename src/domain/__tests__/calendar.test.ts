import { monthGrid, monthTitle, shiftMonth, toExpoWeekday } from '../calendar';

describe('calendario', () => {
  it('noviembre 2026 empieza en domingo: 6 semanas, lunes primero', () => {
    const g = monthGrid(2026, 10);
    expect(g[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(g.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(g).toHaveLength(6);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });
  it('febrero 2027 (empieza en lunes) cabe en 4 semanas', () => {
    expect(monthGrid(2027, 1)).toHaveLength(4);
  });
  it('título y cambio de mes', () => {
    expect(monthTitle(2026, 10)).toBe('Noviembre 2026');
    expect(shiftMonth(2026, 11, 1)).toEqual([2027, 0]);
    expect(shiftMonth(2026, 0, -1)).toEqual([2025, 11]);
  });
  it('día de la semana para las notificaciones (1 = domingo en expo)', () => {
    expect(toExpoWeekday(1)).toBe(2); // lunes
    expect(toExpoWeekday(6)).toBe(7); // sábado
    expect(toExpoWeekday(7)).toBe(1); // domingo
  });
});
