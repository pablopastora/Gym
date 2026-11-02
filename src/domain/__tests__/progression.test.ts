import { diffDays } from '../dates';
import { deloadSets, deloadStatus, stallCount, suggestProgression, type HistSession, type ProgressionConfig } from '../progression';
import { computeRecords, sessionBests, setBeatsRecord } from '../records';

const upper: ProgressionConfig = { sets: 3, repMin: 8, repMax: 12, region: 'superior', incUpper: 2.5, incLower: 5, deficitMode: true };
const lower: ProgressionConfig = { ...upper, region: 'inferior', repMin: 6, repMax: 8 };

const ses = (date: string, w: number | null, reps: number[], extra: { rir?: number; fallo?: boolean } = {}): HistSession => ({
  date,
  sets: reps.map((r) => ({
    weightKg: w,
    reps: r,
    rir: extra.rir ?? null,
    setType: extra.fallo ? 'fallo' : 'normal',
  })),
});

describe('doble progresión', () => {
  it('sin historial → primera vez', () => {
    expect(suggestProgression([], upper).action).toBe('primera_vez');
  });

  it('todas las series en el techo → sube +2,5 kg (superior) y vuelve al mínimo', () => {
    const s = suggestProgression([ses('2026-11-02', 60, [12, 12, 12])], upper);
    expect(s).toMatchObject({ action: 'subir', weightKg: 62.5, deltaKg: 2.5, reps: 8 });
  });

  it('tren inferior sube +5 kg', () => {
    expect(suggestProgression([ses('2026-11-02', 100, [8, 8, 8])], lower)).toMatchObject({ action: 'subir', weightKg: 105, deltaKg: 5 });
  });

  it('modo déficit: pierna al límite (RIR 0) sube solo +2,5 kg', () => {
    expect(suggestProgression([ses('2026-11-02', 100, [8, 8, 8], { rir: 0 })], lower)).toMatchObject({ action: 'subir', weightKg: 102.5, deltaKg: 2.5 });
    expect(suggestProgression([ses('2026-11-02', 100, [8, 8, 8], { rir: 0 })], { ...lower, deficitMode: false })).toMatchObject({ weightKg: 105 });
  });

  it('modo déficit: nunca dos subidas seguidas → consolidar', () => {
    const h = [ses('2026-10-26', 60, [12, 12, 12]), ses('2026-11-02', 62.5, [12, 12, 12])];
    expect(suggestProgression(h, upper)).toMatchObject({ action: 'consolidar', weightKg: 62.5, deltaKg: 0 });
    expect(suggestProgression(h, { ...upper, deficitMode: false })).toMatchObject({ action: 'subir', weightKg: 65 });
  });

  it('tras consolidar, vuelve a subir', () => {
    const h = [ses('2026-10-26', 60, [12, 12, 12]), ses('2026-11-02', 62.5, [12, 12, 12]), ses('2026-11-09', 62.5, [12, 12, 12])];
    expect(suggestProgression(h, upper)).toMatchObject({ action: 'subir', weightKg: 65 });
  });

  it('dentro del rango → mantener', () => {
    expect(suggestProgression([ses('2026-11-02', 60, [10, 9, 9])], upper)).toMatchObject({ action: 'mantener', weightKg: 60 });
  });

  it('fallar el mínimo NO baja el peso (primera, segunda vez)', () => {
    const s1 = suggestProgression([ses('2026-11-02', 60, [8, 7, 6])], upper);
    expect(s1).toMatchObject({ action: 'mantener', weightKg: 60 });
    expect(s1.note).toMatch(/no baja el peso/i);
    const s2 = suggestProgression([ses('2026-10-26', 60, [8, 7, 6]), ses('2026-11-02', 60, [8, 6, 6])], upper);
    expect(s2).toMatchObject({ action: 'mantener', weightKg: 60, stallCount: 1 });
  });

  it('3 sesiones estancadas → sugiere −10 % pero mantiene el peso propuesto', () => {
    const h = [
      ses('2026-10-12', 60, [10, 9, 8]),
      ses('2026-10-19', 60, [10, 9, 8]),
      ses('2026-10-26', 60, [9, 9, 8]),
      ses('2026-11-02', 60, [8, 7, 7]),
    ];
    expect(stallCount(h, upper)).toBe(3);
    const s = suggestProgression(h, upper);
    expect(s).toMatchObject({ action: 'estancado', weightKg: 60, altWeightKg: 55, stallCount: 3 });
  });

  it('sumar reps al mismo peso cuenta como progreso', () => {
    const h = [ses('2026-10-12', 60, [10, 9, 8]), ses('2026-10-19', 60, [10, 9, 8]), ses('2026-10-26', 60, [10, 10, 8])];
    expect(stallCount(h, upper)).toBe(0);
  });

  it('bajar el peso voluntariamente reinicia el contador', () => {
    const h = [ses('2026-10-19', 60, [8, 7, 7]), ses('2026-10-26', 60, [8, 7, 7]), ses('2026-11-02', 55, [10, 10, 9])];
    expect(stallCount(h, upper)).toBe(0);
  });

  it('el peso de trabajo es el más repetido (una serie de bajada no cuenta)', () => {
    const h: HistSession[] = [
      {
        date: '2026-11-02',
        sets: [
          { weightKg: 60, reps: 12, setType: 'normal' },
          { weightKg: 60, reps: 12, setType: 'normal' },
          { weightKg: 60, reps: 12, setType: 'normal' },
          { weightKg: 50, reps: 15, setType: 'drop' },
          { weightKg: 20, reps: 10, setType: 'calentamiento' },
        ],
      },
    ];
    expect(suggestProgression(h, upper)).toMatchObject({ action: 'subir', weightKg: 62.5 });
  });

  it('menos series de las previstas no sube', () => {
    expect(suggestProgression([ses('2026-11-02', 60, [12, 12])], upper).action).toBe('mantener');
  });

  it('peso corporal en el techo → lastre', () => {
    expect(suggestProgression([ses('2026-11-02', null, [12, 12, 12])], upper).action).toBe('lastre');
  });
});

describe('descarga', () => {
  const base = { today: '2026-11-02', deloadUntil: null, snoozeUntil: null, stalledRatio: 0, stalledExercises: 0, avgRirLastWeek: null };
  it('sin entrenos → no', () => expect(deloadStatus({ ...base, sinceDate: null }, diffDays).state).toBe('no'));
  it('5 semanas → no; 6 → sugerida; 8 → recomendada', () => {
    expect(deloadStatus({ ...base, sinceDate: '2026-09-28' }, diffDays).state).toBe('no');
    expect(deloadStatus({ ...base, sinceDate: '2026-09-21' }, diffDays).state).toBe('sugerida');
    expect(deloadStatus({ ...base, sinceDate: '2026-09-07' }, diffDays).state).toBe('recomendada');
  });
  it('fatiga por estancamiento', () => {
    const r = deloadStatus({ ...base, sinceDate: '2026-10-12', stalledRatio: 0.4, stalledExercises: 4 }, diffDays);
    expect(r.state).toBe('sugerida');
    expect(r.reason).toMatch(/Fatiga/);
  });
  it('activa y pospuesta', () => {
    expect(deloadStatus({ ...base, sinceDate: '2026-09-07', deloadUntil: '2026-11-05' }, diffDays).state).toBe('activa');
    expect(deloadStatus({ ...base, sinceDate: '2026-09-07', snoozeUntil: '2026-11-09' }, diffDays).state).toBe('no');
  });
  it('mitad de series', () => {
    expect([deloadSets(4), deloadSets(3), deloadSets(1)]).toEqual([2, 2, 1]);
  });
});

describe('récords', () => {
  const s = (workoutId: number, date: string, sets: [number, number][]) => ({
    workoutId,
    date,
    sets: sets.map(([w, r]) => ({ weightKg: w, reps: r, setType: 'normal' as const })),
  });
  it('mejores de una sesión (sin calentamientos)', () => {
    const b = sessionBests([
      { weightKg: 40, reps: 10, setType: 'calentamiento' },
      { weightKg: 80, reps: 8, setType: 'normal' },
      { weightKg: 85, reps: 3, setType: 'normal' },
    ]);
    expect(b.maxWeight).toBe(85);
    expect(b.maxWeightReps).toBe(3);
    expect(b.bestE1rm).toBeCloseTo(101.33, 1); // 80×8 > 85×3 (93,5)
    expect(b.volume).toBe(80 * 8 + 85 * 3);
  });
  it('la primera sesión no es récord; las siguientes que mejoran sí', () => {
    const { records, history } = computeRecords([
      s(1, '2026-10-01', [[80, 8]]),
      s(2, '2026-10-08', [[80, 9]]),
      s(3, '2026-10-15', [[82.5, 6]]),
    ]);
    expect(history[0].records).toEqual([]);
    expect(history[1].records).toEqual(['e1rm', 'volumen']);
    expect(history[2].records).toEqual(['peso_max']);
    expect(records.peso_max?.value).toBe(82.5);
    expect(records.e1rm?.workoutId).toBe(2);
  });
  it('aviso en directo al batir peso o 1RM', () => {
    const prev = { maxWeight: 80, bestE1rm: 101.3 };
    expect(setBeatsRecord({ weightKg: 82.5, reps: 3 }, prev)).toEqual(['peso_max']);
    expect(setBeatsRecord({ weightKg: 80, reps: 9 }, prev)).toEqual(['e1rm']);
    expect(setBeatsRecord({ weightKg: 70, reps: 8 }, prev)).toEqual([]);
    expect(setBeatsRecord({ weightKg: 100, reps: 1 }, null)).toEqual([]);
  });
});
