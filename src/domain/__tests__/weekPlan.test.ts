import { buildWeekPlan, dayLabel, defaultTrainingWeekdays, resolveTrainingWeekdays, weekdayOf, type DoneWorkout } from '../weekPlan';

const days = [
  { id: 1, sortOrder: 0, isOptional: false, name: 'Día 1' },
  { id: 2, sortOrder: 1, isOptional: false, name: 'Día 2' },
  { id: 3, sortOrder: 2, isOptional: false, name: 'Día 3' },
  { id: 4, sortOrder: 3, isOptional: false, name: 'Día 4' },
  { id: 5, sortOrder: 4, isOptional: true, name: 'Día 5' },
];
// Semana del lunes 2 nov 2026. Días de entreno por defecto con 4 días: L, M, J, V.
const W4 = [1, 2, 4, 5];
const done = (entries: [string, number][]) => {
  const m = new Map<string, DoneWorkout[]>();
  entries.forEach(([d, dayId], i) => m.set(d, [...(m.get(d) ?? []), { id: i + 1, name: `Día ${dayId}`, routineDayId: dayId }]));
  return m;
};
const plan = (today: string, entries: [string, number][], weekdays = W4) =>
  buildWeekPlan({
    today,
    trainingWeekdays: weekdays,
    routineDays: days,
    daysPerWeek: weekdays.length,
    lastDoneDayId: entries.length ? entries[entries.length - 1][1] : null,
    doneByDate: done(entries),
  });

describe('utilidades', () => {
  it('día de la semana y etiquetas', () => {
    expect(weekdayOf('2026-11-02')).toBe(1); // lunes
    expect(weekdayOf('2026-11-08')).toBe(7); // domingo
    expect(dayLabel('2026-11-03', '2026-11-03')).toBe('Hoy');
    expect(dayLabel('2026-11-04', '2026-11-03')).toBe('Mañana');
    expect(dayLabel('2026-11-05', '2026-11-03')).toBe('Jueves');
    expect(dayLabel('2026-11-02', '2026-11-03')).toBe('Ayer');
  });
  it('días de entreno por defecto y personalizados', () => {
    expect(defaultTrainingWeekdays(4)).toEqual([1, 2, 4, 5]);
    expect(resolveTrainingWeekdays({ trainingWeekdays: null, daysPerWeek: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(resolveTrainingWeekdays({ trainingWeekdays: [6, 1, 3, 3], daysPerWeek: 4 })).toEqual([1, 3, 6]);
  });
});

describe('plan semanal', () => {
  it('antes de entrenar: hoy pendiente con la siguiente sesión', () => {
    const p = plan('2026-11-03', [['2026-11-02', 1]]); // martes; ayer Día 1
    expect(p.todayEntry).toMatchObject({ label: 'Hoy', status: 'pendiente' });
    expect(p.todayEntry.session?.id).toBe(2);
    expect(p.next?.isToday).toBe(true);
  });

  it('tras terminar hoy el Día 2: hoy completado y la siguiente sesión NO es hoy', () => {
    const p = plan('2026-11-03', [
      ['2026-11-02', 1],
      ['2026-11-03', 2],
    ]);
    expect(p.todayEntry.status).toBe('completado');
    expect(p.todayEntry.session).toBeNull();
    // Mañana (miércoles) es descanso con 4 días; la siguiente sesión es el jueves.
    const wed = p.days.find((d) => d.date === '2026-11-04')!;
    expect(wed).toMatchObject({ label: 'Mañana', status: 'descanso' });
    expect(p.next).toMatchObject({ date: '2026-11-05', label: 'Jueves', status: 'programado' });
    expect(p.next?.session?.id).toBe(3);
  });

  it('si mañana es día de entreno, la siguiente sesión se etiqueta «Mañana»', () => {
    const p = plan('2026-11-02', [['2026-11-02', 1]]); // lunes hecho; martes entreno
    expect(p.next).toMatchObject({ date: '2026-11-03', label: 'Mañana' });
    expect(p.next?.session?.id).toBe(2);
  });

  it('al cruzar la medianoche, el entreno de ayer queda completado y hoy toca el siguiente', () => {
    const p = plan('2026-11-03', [['2026-11-02', 1]]);
    expect(p.days.find((d) => d.date === '2026-11-02')).toMatchObject({ label: 'Ayer', status: 'completado' });
    expect(p.todayEntry).toMatchObject({ status: 'pendiente' });
    expect(p.todayEntry.session?.id).toBe(2);
  });

  it('saltarse un día no salta una sesión: el día perdido queda marcado', () => {
    // Lunes Día 1; martes no entrena; hoy jueves → toca el Día 2 (no el 3).
    const p = plan('2026-11-05', [['2026-11-02', 1]]);
    expect(p.days.find((d) => d.date === '2026-11-03')?.status).toBe('perdido');
    expect(p.days.find((d) => d.date === '2026-11-04')?.status).toBe('descanso');
    expect(p.todayEntry.session?.id).toBe(2);
    expect(p.days.find((d) => d.date === '2026-11-06')?.session?.id).toBe(3);
  });

  it('hoy descanso: no hay sesión hoy, pero se puede adelantar la siguiente', () => {
    const p = plan('2026-11-04', [
      ['2026-11-02', 1],
      ['2026-11-03', 2],
    ]); // miércoles
    expect(p.todayEntry.status).toBe('descanso');
    expect(p.nextSessionNow?.id).toBe(3);
    expect(p.next).toMatchObject({ label: 'Mañana', date: '2026-11-05' });
  });

  it('el domingo se muestra también el lunes siguiente como «Mañana»', () => {
    const p = plan('2026-11-08', [['2026-11-06', 4]]);
    expect(p.days.at(-1)).toMatchObject({ date: '2026-11-09', label: 'Mañana', status: 'programado' });
    expect(p.days.at(-1)?.session?.id).toBe(1); // con 4 días se salta el opcional
  });

  it('con 5 días incluye el opcional en la rotación', () => {
    const p = plan('2026-11-06', [['2026-11-05', 4]], [1, 2, 3, 4, 5]);
    expect(p.todayEntry.session?.id).toBe(5);
  });

  it('dos sesiones el mismo día: el día sigue completado con ambos entrenos', () => {
    const p = plan('2026-11-03', [
      ['2026-11-03', 2],
      ['2026-11-03', 3],
    ]);
    expect(p.todayEntry.workouts).toHaveLength(2);
    expect(p.next?.session?.id).toBe(4);
  });
});
