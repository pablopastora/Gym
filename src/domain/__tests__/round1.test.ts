import { addDays } from '../dates';
import { weeklyMuscleMap } from '../muscleMap';
import { DEFAULT_PLATES, formatPlates, plateBreakdown, usesPlates } from '../plates';
import { workoutToText } from '../shareText';
import { afterSetInSuperset, linkGroup, type SsExercise } from '../supersets';
import { buildWeekPlan, nextFreeDay } from '../weekPlan';

describe('calculadora de discos', () => {
  it('100 kg con barra de 20: 25 + 15 por lado', () => {
    expect(plateBreakdown(100, 20)).toMatchObject({ perSide: [25, 15], achievedKg: 100, remainderKg: 0 });
  });
  it('82,5 kg: 25 + 5 + 1,25', () => {
    const r = plateBreakdown(82.5, 20);
    expect(r.perSide).toEqual([25, 5, 1.25]);
    expect(formatPlates(r.perSide)).toBe('25 + 5 + 1,25');
  });
  it('si no cuadra con los discos disponibles, indica lo que falta', () => {
    const r = plateBreakdown(83, 20, DEFAULT_PLATES);
    expect(r.achievedKg).toBe(82.5);
    expect(r.remainderKg).toBe(0.5);
  });
  it('solo con los discos que tienes', () => {
    expect(plateBreakdown(100, 20, [20, 10, 5]).perSide).toEqual([20, 20]);
  });
  it('por debajo o igual a la barra', () => {
    expect(plateBreakdown(20, 20)).toMatchObject({ perSide: [], belowBar: false });
    expect(plateBreakdown(15, 20).belowBar).toBe(true);
    expect(formatPlates([])).toBe('Solo la barra');
  });
  it('qué ejercicios la ofrecen', () => {
    expect(usesPlates('barbell')).toBe(true);
    expect(usesPlates('dumbbell')).toBe(false);
  });
});

describe('mapa muscular semanal', () => {
  it('principal cuenta 1 y secundario 0,5', () => {
    const m = weeklyMuscleMap([
      { primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], sets: 10 },
      { primaryMuscles: ['triceps'], secondaryMuscles: [], sets: 3 },
    ]);
    const get = (k: string) => m.find((c) => c.key === k)!;
    expect(get('pecho')).toMatchObject({ sets: 10, target: 10, level: 'objetivo' });
    expect(get('triceps')).toMatchObject({ sets: 8, level: 'objetivo' }); // 3 + 5
    expect(get('hombro')).toMatchObject({ sets: 5, level: 'medio' });
    expect(get('pierna')).toMatchObject({ sets: 0, level: 'nada' });
  });
  it('nivel bajo por debajo de la mitad del objetivo', () => {
    const m = weeklyMuscleMap([{ primaryMuscles: ['quadriceps'], secondaryMuscles: [], sets: 4 }]);
    expect(m.find((c) => c.key === 'pierna')?.level).toBe('bajo');
  });
});

describe('compartir como texto', () => {
  it('incluye ejercicios, series, RIR, tipo, volumen, kcal y récords', () => {
    const t = workoutToText({
      name: 'Día 1 · Pecho + tríceps',
      date: '2026-11-03',
      startedAt: 0,
      endedAt: 3_600_000,
      kcal: 412,
      notes: 'Buen día',
      exercises: [
        {
          name: 'Press de banca con barra',
          notes: 'Agarre medio',
          sets: [
            { setType: 'calentamiento', weightKg: 40, reps: 8, rir: null, rpe: null, completed: true },
            { setType: 'normal', weightKg: 82.5, reps: 6, rir: 2, rpe: null, completed: true },
            { setType: 'normal', weightKg: 82.5, reps: 6, rir: null, rpe: null, completed: false },
          ],
        },
        { name: 'Aperturas', notes: null, supersetGroup: 1, sets: [{ setType: 'drop', weightKg: 15, reps: 10, rir: 0, rpe: null, completed: true }] },
      ],
      records: [{ exercise: 'Press de banca con barra', types: ['peso_max'] }],
    });
    expect(t).toContain('Día 1 · Pecho + tríceps — martes 3 nov');
    expect(t).toContain('Duración 1:00:00 · ~412 kcal');
    expect(t).toContain('1. 40 kg × 8 (calent.)');
    expect(t).toContain('2. 82,5 kg × 6 @RIR 2');
    expect(t).not.toContain('3. 82,5');
    expect(t).toContain('• Aperturas [superserie]');
    expect(t).toContain('15 kg × 10 @RIR 0 (drop)');
    expect(t).toContain('Total: 2 series de trabajo · 645 kg de volumen');
    expect(t).toContain('🏆 Récords: Press de banca con barra (peso máximo)');
    expect(t).toContain('Nota: Agarre medio');
  });
});

describe('superseries', () => {
  const ex = (id: number, group: number | null, done: boolean[], restS = 90): SsExercise => ({
    id,
    name: `E${id}`,
    supersetGroup: group,
    restS,
    sets: done.map((c, i) => ({ id: id * 10 + i, setType: 'normal', completed: c })),
  });
  it('A1 completada → pasar a B1 sin descanso; B1 completada → descanso (el mayor del grupo)', () => {
    const list = [ex(1, 7, [false, false], 60), ex(2, 7, [false, false], 90)];
    expect(afterSetInSuperset(list, 1, 10)).toEqual({ kind: 'siguiente', exerciseId: 2, label: 'E2' });
    expect(afterSetInSuperset(list, 2, 20)).toEqual({ kind: 'descanso', restS: 90 });
  });
  it('si el compañero ya no tiene series, descanso normal', () => {
    const list = [ex(1, 7, [true, false]), ex(2, 7, [true, true])];
    expect(afterSetInSuperset(list, 1, 11).kind).toBe('descanso');
  });
  it('sin superserie: descanso propio', () => {
    expect(afterSetInSuperset([ex(1, null, [false], 75)], 1, 10)).toEqual({ kind: 'descanso', restS: 75 });
  });
  it('enlazar reutiliza el grupo existente', () => {
    expect(linkGroup(5, 6, null, null)).toBe(5);
    expect(linkGroup(5, 6, null, 3)).toBe(3);
  });
});

describe('mover un día', () => {
  const days = [1, 2, 3, 4].map((id, i) => ({ id, sortOrder: i, isOptional: false }));
  const base = { trainingWeekdays: [1, 2, 4, 5], routineDays: days, daysPerWeek: 4, lastDoneDayId: 1, doneByDate: new Map() };
  it('pasar la sesión de hoy a mañana (que era descanso): hoy descanso, mañana la sesión, el resto igual', () => {
    const today = '2026-11-03'; // martes
    const p = buildWeekPlan({ ...base, today, overrides: new Map([[today, false], [addDays(today, 1), true]]) });
    expect(p.todayEntry.status).toBe('descanso');
    expect(p.days.find((d) => d.date === '2026-11-04')).toMatchObject({ label: 'Mañana', status: 'programado' });
    expect(p.days.find((d) => d.date === '2026-11-04')?.session?.id).toBe(2);
    expect(p.days.find((d) => d.date === '2026-11-05')?.session?.id).toBe(3); // jueves sigue con el 3
  });
  it('pasar a un día que ya era de entreno desplaza el resto de la semana', () => {
    const today = '2026-11-05'; // jueves; Día 2 pendiente
    const p = buildWeekPlan({ ...base, today, overrides: new Map([[today, false]]) });
    expect(p.days.find((d) => d.date === '2026-11-06')?.session?.id).toBe(2);
  });
  it('siguiente día libre', () => {
    const p = buildWeekPlan({ ...base, today: '2026-11-03' });
    expect(nextFreeDay(p, '2026-11-03')).toBe('2026-11-04');
    expect(nextFreeDay(p, '2026-11-05')).toBe('2026-11-07');
  });
});
