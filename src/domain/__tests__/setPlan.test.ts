import type { ExerciseRole } from '@/db/schema';

import {
  allowsIntensityTechnique,
  defaultRole,
  fmtRir,
  mesoWeek,
  needsConservative,
  planSession,
  recommendedScheme,
  rirTarget,
  techniqueBudget,
  type PlanCtx,
  type PlanItem,
} from '../setPlan';

const item = (over: Partial<PlanItem> & { role: ExerciseRole }): PlanItem => ({
  exerciseId: 'X',
  nameEs: 'Ejercicio',
  kind: over.role === 'aislamiento' ? 'accesorio' : 'compuesto',
  equipment: 'dumbbell',
  group: 'pecho',
  repMin: 8,
  repMax: 12,
  topSet: false,
  conservative: false,
  working: Array.from({ length: 3 }, () => ({ setType: 'normal' as const, weightKg: 40, reps: 10 })),
  ...over,
});
const BENCH = item({ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', nameEs: 'Press de banca con barra', role: 'basico', equipment: 'barbell', repMin: 5, repMax: 8, working: Array.from({ length: 4 }, () => ({ setType: 'normal' as const, weightKg: 80, reps: 6 })) });
const ctx = (over: Partial<PlanCtx> = {}): PlanCtx => ({ week: 2, deload: false, deficit: false, barKg: 20, injuries: null, ...over });

describe('roles', () => {
  it('clasificación por patrón y equipamiento', () => {
    expect(defaultRole({ id: 'Barbell_Squat', kind: 'compuesto', equipment: 'barbell' })).toBe('basico');
    expect(defaultRole({ id: 'Close-Grip_Barbell_Bench_Press', kind: 'compuesto', equipment: 'barbell' })).toBe('basico');
    expect(defaultRole({ id: 'Incline_Dumbbell_Press', kind: 'compuesto', equipment: 'dumbbell' })).toBe('accesorio');
    expect(defaultRole({ id: 'Leg_Press', kind: 'compuesto', equipment: 'machine' })).toBe('accesorio');
    expect(defaultRole({ id: 'Side_Lateral_Raise', kind: 'accesorio', equipment: 'dumbbell' })).toBe('aislamiento');
  });
  it('esquemas por defecto', () => {
    expect(recommendedScheme('basico', false)).toEqual({ sets: 4, repMin: 5, repMax: 8 });
    expect(recommendedScheme('basico', true).sets).toBe(3);
    expect(recommendedScheme('accesorio', true)).toEqual({ sets: 3, repMin: 8, repMax: 12 });
    expect(recommendedScheme('aislamiento', false)).toEqual({ sets: 3, repMin: 12, repMax: 15 });
  });
});

describe('mesociclo de 4 semanas', () => {
  it('semana según el inicio o la última descarga', () => {
    expect(mesoWeek('2026-11-05', { mesoStart: '2026-11-02' })).toBe(1);
    expect(mesoWeek('2026-11-12', { mesoStart: '2026-11-02' })).toBe(2);
    expect(mesoWeek('2026-11-19', { mesoStart: '2026-11-02' })).toBe(3);
    expect(mesoWeek('2026-11-26', { mesoStart: '2026-11-02' })).toBe(4);
    expect(mesoWeek('2026-12-20', { mesoStart: '2026-11-02' })).toBe(4); // descarga pendiente
    // Tras una descarga empezada el 23 nov, el ciclo vuelve a la S1 el lunes 30.
    expect(mesoWeek('2026-11-25', { lastDeloadDate: '2026-11-23' })).toBe(4);
    expect(mesoWeek('2026-11-30', { lastDeloadDate: '2026-11-23' })).toBe(1);
    // Reinicio manual posterior a la última descarga.
    expect(mesoWeek('2026-12-15', { lastDeloadDate: '2026-11-02', mesoStart: '2026-12-14' })).toBe(1);
  });
  it('RIR objetivo por semana y rol (S1 3, S2 2, S3 1-2)', () => {
    expect([1, 2, 3].map((w) => rirTarget('basico', w as 1 | 2 | 3))).toEqual([3, 2.5, 2]);
    expect([1, 2, 3].map((w) => rirTarget('accesorio', w as 1 | 2 | 3))).toEqual([2.5, 2, 1.5]);
    expect([1, 2, 3].map((w) => rirTarget('aislamiento', w as 1 | 2 | 3))).toEqual([2, 1, 0.5]);
    expect(rirTarget('aislamiento', 4)).toBe(3.5);
    expect(rirTarget('basico', 3, { conservative: true })).toBe(3);
    expect([fmtRir(2), fmtRir(1.5), fmtRir(0.5), fmtRir(null)]).toEqual(['2', '1-2', '0-1', '—']);
  });
  it('presupuesto de técnicas: 0 en S1/S4/descarga, 1 en déficit, 2 si no', () => {
    expect(techniqueBudget({ week: 1, deload: false, deficit: false })).toBe(0);
    expect(techniqueBudget({ week: 2, deload: false, deficit: true })).toBe(1);
    expect(techniqueBudget({ week: 3, deload: false, deficit: false })).toBe(2);
    expect(techniqueBudget({ week: 3, deload: true, deficit: false })).toBe(0);
  });
});

describe('asignación del tipo de serie', () => {
  it('calentamiento 40/60/80 % solo en el primer básico de cada músculo', () => {
    const second = { ...BENCH, exerciseId: 'Close-Grip_Barbell_Bench_Press', nameEs: 'Press de banca agarre cerrado' };
    const legs = { ...BENCH, exerciseId: 'Barbell_Squat', nameEs: 'Sentadilla con barra', group: 'pierna' };
    const [a, b, c] = planSession([BENCH, second, legs], ctx());
    expect(a.sets.filter((s) => s.setType === 'calentamiento').map((s) => s.weightKg)).toEqual([32.5, 47.5, 65]);
    expect(b.sets.some((s) => s.setType === 'calentamiento')).toBe(false);
    expect(b.note).toMatch(/ya está caliente/);
    expect(c.sets.filter((s) => s.setType === 'calentamiento')).toHaveLength(3);
  });
  it('accesorios y aislamientos sin calentamiento; peso constante en accesorio', () => {
    const [acc] = planSession([item({ role: 'accesorio' })], ctx());
    expect(acc.sets.every((s) => s.setType === 'normal' && s.weightKg === 40)).toBe(true);
    expect(acc.sets[0].targetRir).toBe(2);
  });
  it('calentamientos sin pesos repetidos con poca carga', () => {
    const light = { ...BENCH, working: [{ setType: 'normal' as const, weightKg: 30, reps: 8 }, { setType: 'normal' as const, weightKg: 30, reps: 8 }] };
    const w = planSession([light], ctx())[0].sets.filter((s) => s.setType === 'calentamiento');
    expect(w.map((s) => s.weightKg)).toEqual([20, 25]);
  });
  it('básicos: nunca fallo ni dropset; serie top + descargas a −9 % si se activa', () => {
    const [b] = planSession([{ ...BENCH, topSet: true }], ctx({ week: 3 }));
    const work = b.sets.filter((s) => s.setType !== 'calentamiento');
    expect(work.map((s) => [s.setType, s.weightKg])).toEqual([
      ['normal', 80],
      ['backoff', 72.5],
      ['backoff', 72.5],
      ['backoff', 72.5],
    ]);
    expect(b.technique).toBeNull();
    expect(b.note).toMatch(/serie top/i);
  });
  it('al fallo/dropset solo en la última serie de aislamientos o máquinas, máx. 2 por sesión', () => {
    const iso = (id: string, equipment: string) => item({ exerciseId: id, nameEs: id, role: 'aislamiento', equipment });
    const plans = planSession([BENCH, iso('a', 'cable'), iso('b', 'dumbbell'), iso('c', 'body only')], ctx({ week: 3 }));
    expect(plans.filter((p) => p.technique)).toHaveLength(2);
    // Se eligen las del final de la sesión.
    expect(plans[3].technique).toBe('fallo'); // peso corporal → al fallo
    expect(plans[2].technique).toBe('drop'); // mancuernas → dropset
    expect(plans[1].technique).toBeNull();
    const fallo = plans[3].sets.at(-1)!;
    expect(fallo).toMatchObject({ setType: 'fallo', targetRir: 0 });
    expect(plans[3].note).toMatch(/al fallo técnico, sin dropset/);
  });
  it('dropset: −22 % y −40 % (2 caídas) o 1 caída en déficit, sin calentamientos', () => {
    const iso = item({ role: 'aislamiento', equipment: 'machine', working: [1, 2, 3].map(() => ({ setType: 'normal' as const, weightKg: 50, reps: 12 })) });
    const off = planSession([iso], ctx({ week: 3 }))[0];
    expect(off.sets.filter((s) => s.setType === 'drop').map((s) => s.weightKg)).toEqual([40, 30]);
    const def = planSession([iso], ctx({ week: 3, deficit: true }))[0];
    expect(def.sets.filter((s) => s.setType === 'drop').map((s) => s.weightKg)).toEqual([40]);
    expect(def.note).toMatch(/dropset → 40 kg sin descanso/);
  });
  it('déficit: máximo 1 técnica por sesión; descarga y semana 1: ninguna', () => {
    const isos = ['a', 'b', 'c'].map((id) => item({ exerciseId: id, nameEs: id, role: 'aislamiento', equipment: 'cable' }));
    expect(planSession(isos, ctx({ deficit: true })).filter((p) => p.technique)).toHaveLength(1);
    expect(planSession(isos, ctx({ deload: true })).filter((p) => p.technique)).toHaveLength(0);
    expect(planSession(isos, ctx({ week: 1 })).filter((p) => p.technique)).toHaveLength(0);
    expect(planSession(isos, ctx({ techniquesUsed: 2 })).filter((p) => p.technique)).toHaveLength(0);
  });
  it('nunca en ejercicios de riesgo aunque se marquen como aislamiento', () => {
    expect(allowsIntensityTechnique({ id: 'x', nameEs: 'Sentadilla hack en máquina', kind: 'compuesto', equipment: 'machine' }, 'aislamiento')).toBe(false);
    expect(allowsIntensityTechnique({ id: 'x', nameEs: 'Peso muerto rumano con mancuernas', kind: 'compuesto', equipment: 'dumbbell' }, 'aislamiento')).toBe(false);
    expect(allowsIntensityTechnique({ id: 'x', nameEs: 'Curl en polea', kind: 'accesorio', equipment: 'cable' }, 'aislamiento')).toBe(true);
  });
  it('respeta las lesiones del perfil', () => {
    const skull = item({ exerciseId: 'EZ', nameEs: 'Press francés con barra Z', role: 'aislamiento', equipment: 'e-z curl bar' });
    expect(planSession([skull], ctx({ injuries: 'codo' }))[0].technique).toBeNull();
    expect(planSession([skull], ctx())[0].technique).toBe('fallo');
  });
  it('sesión conservadora tras RIR 0 o fallar el mínimo en un básico', () => {
    expect(needsConservative('basico', { hard: true, anyBelowMin: false })).toBe(true);
    expect(needsConservative('basico', { hard: false, anyBelowMin: true })).toBe(true);
    expect(needsConservative('aislamiento', { hard: true, anyBelowMin: true })).toBe(false);
    const [b] = planSession([{ ...BENCH, conservative: true, topSet: true }], ctx({ week: 3 }));
    expect(b.sets.find((s) => s.setType !== 'calentamiento')?.targetRir).toBe(3);
    expect(b.sets.some((s) => s.setType === 'backoff')).toBe(false); // sin serie top hoy
    expect(b.note).toMatch(/conservadora/);
  });
  it('no cambia peso ni reps de la doble progresión (salvo descargas de la serie top)', () => {
    const acc = item({ role: 'accesorio', working: [{ setType: 'normal', weightKg: 42.5, reps: 9 }, { setType: 'normal', weightKg: 42.5, reps: 8 }] });
    expect(planSession([acc], ctx())[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [42.5, 9],
      [42.5, 8],
    ]);
  });
});
