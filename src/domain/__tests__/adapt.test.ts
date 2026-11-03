import { buildExerciseLibrary } from '@/data/library';

import {
  CORE_LIFTS,
  difficulty,
  generateSuggestions,
  isSafeForInjuries,
  MAX_PER_DAY,
  type AdaptInput,
  type LibEx,
  type PastSuggestion,
} from '../adapt';
import type { HistSession } from '../progression';

const library = new Map<string, LibEx>(
  buildExerciseLibrary().map((e) => [
    e.id,
    { id: e.id, nameEs: e.nameEs, primaryMuscles: e.primaryMuscles, equipment: e.equipment ?? null, kind: e.kind, category: e.category, curated: !!e.curated },
  ]),
);

// Hoy: lunes 16 nov 2026. Semanas analizadas: 2-8 nov (W-2) y 9-15 nov (W-1).
const TODAY = '2026-11-16';
const NOW = Date.UTC(2026, 10, 16, 9);

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';
const FLYES = 'Flat_Bench_Cable_Flyes';
const PUSHDOWN = 'Triceps_Pushdown_-_Rope_Attachment';

type H = HistSession & { workoutId: number };
let wid = 1;
const ses = (date: string, kg: number | null, reps: number[], rir?: number): H => ({
  workoutId: wid++,
  date,
  sets: reps.map((r) => ({ weightKg: kg, reps: r, rir: rir ?? null, setType: 'normal' as const })),
});

function input(over: Partial<AdaptInput> & { history?: Map<string, H[]> }): AdaptInput {
  return {
    today: TODAY,
    nowMs: NOW,
    days: [
      {
        id: 1,
        name: 'Día 1',
        isOptional: false,
        exercises: [
          { id: 11, exerciseId: BENCH, sets: 4, repMin: 6, repMax: 8 },
          { id: 12, exerciseId: FLYES, sets: 3, repMin: 12, repMax: 15 },
          { id: 13, exerciseId: PUSHDOWN, sets: 3, repMin: 10, repMax: 15 },
        ],
      },
    ],
    trainingDaysPerWeek: 1,
    library,
    history: new Map(),
    workoutDates: [],
    deficitMode: true,
    injuries: null,
    past: [],
    ...over,
  };
}

const stuckFlyes = () => [ses('2026-10-27', 20, [12, 12, 12]), ses('2026-11-03', 20, [12, 12, 12]), ses('2026-11-10', 20, [12, 12, 12])];
const onlyRule = (r: ReturnType<typeof generateSuggestions>, rule: string) => r.filter((s) => s.rule === rule);

describe('regla «refuerzo»', () => {
  it('2 semanas en el suelo del rango sin progresar → sustituir por variante del mismo músculo con otro equipamiento', () => {
    const r = onlyRule(generateSuggestions(input({ history: new Map([[FLYES, stuckFlyes()]]) })), 'refuerzo');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ action: 'sustituir', routineExerciseId: 12, exerciseId: FLYES, muscle: 'pecho' });
    const alt = library.get(r[0].suggestedExerciseId!)!;
    expect(alt.primaryMuscles[0]).toBe('chest');
    expect(alt.equipment).not.toBe('cable');
    expect(CORE_LIFTS.has(alt.id)).toBe(false);
    expect(r[0].reason).toMatch(/2 semanas/);
  });

  it('con RIR bajo sin avance también salta, aunque no esté en el suelo', () => {
    const h = [ses('2026-11-03', 20, [14, 13, 13], 0), ses('2026-11-10', 20, [14, 13, 13], 1)];
    const r = onlyRule(generateSuggestions(input({ history: new Map([[FLYES, h]]) })), 'refuerzo');
    expect(r).toHaveLength(1);
    expect(r[0].reason).toMatch(/RIR/);
  });

  it('si progresa (más reps o más peso), no hay sugerencia', () => {
    const h = [ses('2026-11-03', 20, [12, 12, 12]), ses('2026-11-10', 20, [13, 12, 12])];
    expect(onlyRule(generateSuggestions(input({ history: new Map([[FLYES, h]]) })), 'refuerzo')).toHaveLength(0);
  });

  it('con datos de una sola semana no se sugiere nada', () => {
    const h = [ses('2026-11-10', 20, [12, 12, 12]), ses('2026-11-12', 20, [12, 12, 12])];
    expect(onlyRule(generateSuggestions(input({ history: new Map([[FLYES, h]]) })), 'refuerzo')).toHaveLength(0);
  });

  it('los básicos principales NUNCA rotan', () => {
    const h = [ses('2026-10-27', 80, [6, 6, 6, 6]), ses('2026-11-03', 80, [6, 6, 6, 5]), ses('2026-11-10', 80, [6, 6, 5, 5])];
    const r = generateSuggestions(input({ history: new Map([[BENCH, h]]) }));
    expect(r.filter((s) => s.exerciseId === BENCH && s.action === 'sustituir')).toHaveLength(0);
  });
});

describe('regla «avance»', () => {
  const easy = () => [ses('2026-11-05', 30, [15, 15, 15], 4), ses('2026-11-12', 30, [15, 15, 15], 4)];

  it('techo del rango con RIR alto en las 2 últimas sesiones → variante más exigente', () => {
    const r = onlyRule(generateSuggestions(input({ history: new Map([[PUSHDOWN, easy()]]) })), 'avance');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ action: 'sustituir', exerciseId: PUSHDOWN, muscle: 'triceps' });
    const alt = library.get(r[0].suggestedExerciseId!)!;
    expect(alt.primaryMuscles[0]).toBe('triceps');
    expect(difficulty(alt)).toBeGreaterThan(difficulty(library.get(PUSHDOWN)!));
  });

  it('sin RIR/RPE registrado no se puede saber si es fácil: nada', () => {
    const h = [ses('2026-11-05', 30, [15, 15, 15]), ses('2026-11-12', 30, [15, 15, 15])];
    expect(onlyRule(generateSuggestions(input({ history: new Map([[PUSHDOWN, h]]) })), 'avance')).toHaveLength(0);
  });

  it('básico fácil: +1 serie fuera de déficit; en déficit, nada (la progresión de carga ya actúa)', () => {
    const h = [ses('2026-11-05', 80, [8, 8, 8, 8], 4), ses('2026-11-12', 80, [8, 8, 8, 8], 4)];
    const off = onlyRule(generateSuggestions(input({ deficitMode: false, history: new Map([[BENCH, h]]) })), 'avance');
    expect(off).toEqual([expect.objectContaining({ action: 'series', setsDelta: 1, exerciseId: BENCH, suggestedExerciseId: null })]);
    expect(onlyRule(generateSuggestions(input({ deficitMode: true, history: new Map([[BENCH, h]]) })), 'avance')).toHaveLength(0);
  });

  it('respeta las lesiones: con molestias de codo no propone press francés ni fondos', () => {
    const r = onlyRule(generateSuggestions(input({ injuries: 'Dolor de codo derecho', history: new Map([[PUSHDOWN, easy()]]) })), 'avance');
    for (const s of r) expect(library.get(s.suggestedExerciseId!)!.nameEs).not.toMatch(/press francés|fondos/i);
  });
});

describe('regla «equilibrio»', () => {
  // Bíceps: en la rutina con 4 series (tope en déficit) pero sin hacerse → 0 series/semana frente a 6.
  const withBiceps = (over: Partial<AdaptInput>) => {
    const base = input(over);
    base.days[0].exercises.push({ id: 14, exerciseId: 'Hammer_Curls', sets: 4, repMin: 10, repMax: 12 });
    return base;
  };
  const chestHistory = () =>
    new Map<string, H[]>([
      [BENCH, [ses('2026-11-03', 80, [7, 7, 7, 7]), ses('2026-11-10', 80, [7, 7, 7, 7])]],
      [FLYES, [ses('2026-11-03', 20, [13, 13, 13, 13, 13, 13]), ses('2026-11-10', 20, [14, 13, 13, 13, 13, 13])]],
      [PUSHDOWN, [ses('2026-11-03', 30, [12, 12, 12, 12, 12, 12]), ses('2026-11-10', 30, [12, 12, 12, 12, 12, 12])]],
    ]);

  it('grupo por debajo de las series objetivo entrenando los días previstos → añadir ejercicio', () => {
    const r = onlyRule(generateSuggestions(withBiceps({ history: chestHistory(), workoutDates: ['2026-11-03', '2026-11-10'] })), 'equilibrio');
    const biceps = r.find((s) => s.muscle === 'biceps');
    expect(biceps).toMatchObject({ action: 'anadir', routineDayId: 1 });
    expect(library.get(biceps!.suggestedExerciseId!)!.primaryMuscles[0]).toBe('biceps');
    expect(biceps!.suggestedExerciseId).not.toBe('Hammer_Curls');
  });

  it('grupos que la rutina no trabaja no generan sugerencias', () => {
    const r = onlyRule(generateSuggestions(input({ history: chestHistory(), workoutDates: ['2026-11-03', '2026-11-10'] })), 'equilibrio');
    expect(r.find((s) => s.muscle === 'pierna' || s.muscle === 'biceps')).toBeUndefined();
  });

  it('si faltan entrenos (adherencia baja), no culpa a la rutina', () => {
    const r = onlyRule(generateSuggestions(withBiceps({ history: chestHistory(), workoutDates: ['2026-11-10'], trainingDaysPerWeek: 2 })), 'equilibrio');
    expect(r).toHaveLength(0);
  });

  it('con un accesorio del grupo en la rutina, propone +1 serie', () => {
    const r = onlyRule(
      generateSuggestions(input({ history: new Map([[PUSHDOWN, [ses('2026-11-03', 30, [12]), ses('2026-11-10', 30, [12])]]]), workoutDates: ['2026-11-03', '2026-11-10'] })),
      'equilibrio',
    );
    expect(r.find((s) => s.muscle === 'triceps')).toMatchObject({ action: 'series', setsDelta: 1, exerciseId: PUSHDOWN });
  });
});

describe('reglas de seguridad', () => {
  it(`máximo ${MAX_PER_DAY} sugerencias por día de rutina`, () => {
    const h = new Map<string, H[]>([
      [FLYES, stuckFlyes()],
      [PUSHDOWN, [ses('2026-10-27', 30, [10, 10, 10]), ses('2026-11-03', 30, [10, 10, 10]), ses('2026-11-10', 30, [10, 10, 10])]],
    ]);
    const r = generateSuggestions(input({ history: h, workoutDates: ['2026-11-03', '2026-11-10'] }));
    expect(r.filter((s) => s.routineDayId === 1).length).toBeLessThanOrEqual(MAX_PER_DAY);
  });

  it('nunca el mismo ejercicio dos semanas seguidas', () => {
    const past: PastSuggestion[] = [
      { weekStart: '2026-11-09', rule: 'refuerzo', exerciseId: FLYES, suggestedExerciseId: 'Dumbbell_Flyes', muscle: 'pecho', status: 'aceptada', decidedAt: NOW - 7 * 86_400_000 },
    ];
    const r = generateSuggestions(input({ history: new Map([[FLYES, stuckFlyes()]]), past }));
    expect(r.filter((s) => s.exerciseId === FLYES || s.suggestedExerciseId === FLYES)).toHaveLength(0);
  });

  it('una sugerencia rechazada no se repite durante 4 semanas', () => {
    const rejected = (daysAgo: number): PastSuggestion[] => [
      { weekStart: '2026-10-19', rule: 'refuerzo', exerciseId: FLYES, suggestedExerciseId: 'Butterfly', muscle: 'pecho', status: 'rechazada', decidedAt: NOW - daysAgo * 86_400_000 },
    ];
    expect(onlyRule(generateSuggestions(input({ history: new Map([[FLYES, stuckFlyes()]]), past: rejected(10) })), 'refuerzo')).toHaveLength(0);
    expect(onlyRule(generateSuggestions(input({ history: new Map([[FLYES, stuckFlyes()]]), past: rejected(30) })), 'refuerzo')).toHaveLength(1);
  });

  it('lesiones: filtro de variantes', () => {
    expect(isSafeForInjuries('Press militar de pie con barra', 'molestia en el hombro')).toBe(false);
    expect(isSafeForInjuries('Elevaciones laterales con mancuernas', 'molestia en el hombro')).toBe(true);
    expect(isSafeForInjuries('Zancadas con mancuernas', 'Rodilla izquierda operada')).toBe(false);
    expect(isSafeForInjuries('Peso muerto rumano', 'hernia lumbar')).toBe(false);
    expect(isSafeForInjuries('Peso muerto rumano', null)).toBe(true);
  });
});
