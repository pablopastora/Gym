import {
  adjustRest,
  formatSets,
  moveItem,
  planExerciseSets,
  restRemainingS,
  summarizeSets,
  warmupPlan,
} from '../workout';

describe('calentamiento', () => {
  it('3 series hacia 100 kg con barra de 20', () => {
    expect(warmupPlan(100, 3, { minKg: 20 })).toEqual([
      { setType: 'calentamiento', weightKg: 40, reps: 8 },
      { setType: 'calentamiento', weightKg: 60, reps: 5 },
      { setType: 'calentamiento', weightKg: 80, reps: 3 },
    ]);
  });
  it('respeta el mínimo de la barra y redondea a 2,5', () => {
    expect(warmupPlan(45, 2, { minKg: 20 }).map((s) => s.weightKg)).toEqual([22.5, 35]);
    expect(warmupPlan(30, 4, { minKg: 20 }).map((s) => s.weightKg)).toEqual([20, 20, 20, 25]);
  });
  it('sin peso conocido deja el peso vacío', () => {
    expect(warmupPlan(null, 2)).toEqual([
      { setType: 'calentamiento', weightKg: null, reps: 8 },
      { setType: 'calentamiento', weightKg: null, reps: 3 },
    ]);
  });
  it('0 series → nada', () => expect(warmupPlan(100, 0)).toEqual([]));
});

describe('plan de series con la última vez', () => {
  it('rellena peso y reps por posición y repite la última si faltan', () => {
    const plan = planExerciseSets({ sets: 4, warmupSets: 0 }, [
      { weightKg: 80, reps: 8 },
      { weightKg: 80, reps: 7 },
      { weightKg: 77.5, reps: 8 },
    ]);
    expect(plan.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 8],
      [80, 7],
      [77.5, 8],
      [77.5, 8],
    ]);
  });
  it('sin historial: series vacías', () => {
    expect(planExerciseSets({ sets: 2, warmupSets: 0 }, null)).toEqual([
      { setType: 'normal', weightKg: null, reps: null },
      { setType: 'normal', weightKg: null, reps: null },
    ]);
  });
  it('los calentamientos se calculan sobre el peso de trabajo más alto', () => {
    const plan = planExerciseSets({ sets: 1, warmupSets: 1 }, [{ weightKg: 100, reps: 5 }], { minKg: 20 });
    expect(plan[0]).toEqual({ setType: 'calentamiento', weightKg: 60, reps: 5 });
    expect(plan[1].setType).toBe('normal');
  });
});

describe('formato y resumen', () => {
  it('formatea series', () => {
    expect(formatSets([{ weightKg: 77.5, reps: 8 }, { weightKg: null, reps: 12 }])).toBe('77,5 × 8 · × 12');
  });
  it('resume solo series de trabajo completadas', () => {
    expect(
      summarizeSets([
        { setType: 'calentamiento', weightKg: 40, reps: 8, completed: true },
        { setType: 'normal', weightKg: 80, reps: 8, completed: true },
        { setType: 'normal', weightKg: 80, reps: 6, completed: true },
        { setType: 'normal', weightKg: 80, reps: 8, completed: false },
      ]),
    ).toEqual({ workingSets: 2, reps: 14, volumeKg: 1120 });
  });
});

describe('temporizador de descanso', () => {
  const now = 1_000_000;
  it('tiempo restante redondeado hacia arriba', () => {
    expect(restRemainingS({ endAt: now + 90_500, totalS: 90 }, now)).toBe(91);
    expect(restRemainingS({ endAt: now - 1, totalS: 90 }, now)).toBe(0);
    expect(restRemainingS(null, now)).toBe(0);
  });
  it('+15 / −15 s', () => {
    const s = { endAt: now + 60_000, totalS: 90 };
    expect(adjustRest(s, 15, now)).toEqual({ endAt: now + 75_000, totalS: 105 });
    expect(adjustRest(s, -15, now)).toEqual({ endAt: now + 45_000, totalS: 75 });
  });
  it('restar más de lo que queda termina el descanso', () => {
    expect(adjustRest({ endAt: now + 10_000, totalS: 90 }, -15, now)).toBeNull();
  });
});

describe('reordenar', () => {
  it('mueve arriba y abajo sin salirse', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  });
});
