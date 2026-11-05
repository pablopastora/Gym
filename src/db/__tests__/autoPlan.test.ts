import { asc, eq } from 'drizzle-orm';

import { profile, routineDay, routineExercise, workoutSet } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { setExerciseRole } from '@/repositories/exercises';
import { clearWeekOverrides, getWeekPlan, moveSession } from '@/repositories/plan';
import { getDeloadStatus, muscleMapSince } from '@/repositories/progress';
import { toggleRoutineSuperset } from '@/repositories/routines';
import { addExerciseToWorkout, completeSet, finishWorkout, startWorkoutFromDay, toggleWorkoutSuperset, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

const at = (date: string, h = 18) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, h).getTime();
};

async function setup(over: Partial<typeof profile.$inferInsert> = {}) {
  const { db } = createTestDb();
  await runSeed(db);
  // Mesociclo empezado el lunes 2 nov → 9-15 nov es la semana 2.
  await db.update(profile).set({ mesoStart: '2026-11-02', ...over });
  const days = await db.select().from(routineDay).orderBy(asc(routineDay.sortOrder));
  const p = async () => (await db.select().from(profile))[0];
  const finishAll = async (id: number, values: Record<string, [number, number, number?]> = {}) => {
    const w = await workoutDetailQuery(db, id);
    for (const we of w!.exercises)
      for (const s of we.sets) {
        const [kg, reps, rir] = values[we.exerciseId] ?? [s.weightKg ?? 20, s.reps ?? 10, 2];
        await completeSet(db, s.id, { weightKg: s.setType === 'calentamiento' || s.setType === 'drop' || s.setType === 'backoff' ? (s.weightKg ?? kg) : kg, reps, rir: rir ?? null });
      }
    await finishWorkout(db, id);
  };
  return { db, days, p, finishAll };
}

describe('plan automático de series en una sesión real', () => {
  it('día 1 (semana 2): calentamiento solo en el básico, RIR objetivo y como mucho 1 técnica en déficit', async () => {
    const { db, days, p, finishAll } = await setup();
    await finishAll(await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02')), { 'Barbell_Bench_Press_-_Medium_Grip': [80, 7, 2] });
    const id = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09'));
    const w = await workoutDetailQuery(db, id);
    const bench = w!.exercises[0];
    expect(bench.role).toBe('basico');
    expect(bench.sets.filter((s) => s.setType === 'calentamiento').map((s) => s.weightKg)).toEqual([32.5, 47.5, 65]);
    expect(bench.sets.filter((s) => s.setType === 'normal').every((s) => s.targetRir === 2.5)).toBe(true);
    // Press inclinado con mancuernas = accesorio: sin calentamiento (la rutina pedía 1).
    expect(w!.exercises[1].role).toBe('accesorio');
    expect(w!.exercises[1].sets.some((s) => s.setType === 'calentamiento')).toBe(false);
    // Déficit (por defecto) → máximo 1 técnica, y nunca en el básico.
    const tech = w!.exercises.filter((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop'));
    expect(tech.length).toBeLessThanOrEqual(1);
    expect(tech.every((e) => e.role !== 'basico')).toBe(true);
    expect(bench.planNote).toMatch(/Básico pesado/);
  });

  it('serie top + descargas; la progresión se mide en la serie top', async () => {
    const { db, days, p, finishAll } = await setup({ deficitMode: false });
    await db.update(routineExercise).set({ topSet: true }).where(eq(routineExercise.exerciseId, 'Barbell_Bench_Press_-_Medium_Grip'));
    const first = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02'));
    await finishAll(first, { 'Barbell_Bench_Press_-_Medium_Grip': [80, 8, 2] });
    const id = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09'));
    const bench = (await workoutDetailQuery(db, id))!.exercises[0];
    const work = bench.sets.filter((s) => s.setType !== 'calentamiento');
    // Top a 82,5 (subió: 8 reps en la serie top) y descargas al −9 %.
    expect(work.map((s) => [s.setType, s.weightKg])).toEqual([
      ['normal', 82.5],
      ['backoff', 75],
      ['backoff', 75],
      ['backoff', 75],
    ]);
  });

  it('RIR 0 en un básico → la siguiente sesión es más conservadora', async () => {
    const { db, days, p, finishAll } = await setup();
    await finishAll(await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02')), { 'Barbell_Bench_Press_-_Medium_Grip': [80, 7, 0] });
    const bench = (await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09'))))!.exercises[0];
    expect(bench.sets.find((s) => s.setType === 'normal')?.targetRir).toBe(3.5);
    expect(bench.planNote).toMatch(/conservadora/);
  });

  it('semana de descarga: mitad de series, sin técnicas y RIR 3-4', async () => {
    const { db, days, p } = await setup({ deloadUntil: '2026-11-15', deficitMode: false });
    const w = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09')));
    expect(w!.exercises.some((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop'))).toBe(false);
    expect(w!.exercises[0].sets.filter((s) => s.setType === 'normal')).toHaveLength(2);
    expect(w!.exercises[0].sets.find((s) => s.setType === 'normal')?.targetRir).toBe(3.5);
  });

  it('semana 1: sin técnicas; semana 3 fuera de déficit: hasta 2', async () => {
    const { db, days, p } = await setup({ deficitMode: false });
    const w1 = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-03')));
    expect(w1!.exercises.filter((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop'))).toHaveLength(0);
    const w3 = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-17')));
    const n = w3!.exercises.filter((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop')).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(2);
  });

  it('rol editable: marcar un aislamiento como básico le quita las técnicas', async () => {
    const { db, days, p } = await setup({ deficitMode: false });
    for (const id of ['Flat_Bench_Cable_Flyes', 'EZ-Bar_Skullcrusher', 'Triceps_Pushdown_-_Rope_Attachment', 'Cable_Rope_Overhead_Triceps_Extension']) await setExerciseRole(db, id, 'basico');
    const w = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-17')));
    expect(w!.exercises.some((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop'))).toBe(false);
  });

  it('los entrenos pasados no cambian al empezar otro ni al cambiar de modo', async () => {
    const { db, days, p, finishAll } = await setup();
    const first = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02'));
    await finishAll(first);
    const before = JSON.stringify(await db.select().from(workoutSet).orderBy(asc(workoutSet.id)));
    await db.update(profile).set({ autoSetPlan: false });
    await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09'));
    const after = (await db.select().from(workoutSet).orderBy(asc(workoutSet.id))).slice(0, JSON.parse(before).length);
    expect(JSON.stringify(after)).toBe(before);
  });

  it('modo manual: calentamientos de la rutina y sin RIR objetivo', async () => {
    const { db, days, p } = await setup({ autoSetPlan: false });
    const w = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09')));
    expect(w!.exercises[1].sets.filter((s) => s.setType === 'calentamiento')).toHaveLength(1);
    expect(w!.exercises.flatMap((e) => e.sets).every((s) => s.targetRir == null)).toBe(true);
    expect(w!.exercises[0].planNote).toBeNull();
  });

  it('añadir un ejercicio a mitad de sesión respeta el tope de técnicas', async () => {
    const { db, days, p } = await setup({ deficitMode: true });
    const id = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-17'));
    await addExerciseToWorkout(db, id, 'Side_Lateral_Raise', await p());
    const w = await workoutDetailQuery(db, id);
    expect(w!.exercises.filter((e) => e.sets.some((s) => s.setType === 'fallo' || s.setType === 'drop')).length).toBeLessThanOrEqual(1);
  });

  it('semana 4 del mesociclo → descarga recomendada', async () => {
    const { db, days, p, finishAll } = await setup();
    await finishAll(await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02')));
    expect((await getDeloadStatus(db, await p(), '2026-11-17')).state).not.toBe('recomendada'); // semana 3
    expect((await getDeloadStatus(db, await p(), '2026-11-24')).state).toBe('recomendada');
  });
});

describe('superseries', () => {
  it('se definen en la rutina y se copian a la sesión; se pueden deshacer', async () => {
    const { db, days, p } = await setup();
    const res = await db.select().from(routineExercise).where(eq(routineExercise.routineDayId, days[0].id)).orderBy(asc(routineExercise.sortOrder));
    expect(await toggleRoutineSuperset(db, res[4].id)).toBe(true);
    const w = await workoutDetailQuery(db, await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-09')));
    const g = w!.exercises[4].supersetGroup;
    expect(g).not.toBeNull();
    expect(w!.exercises[5].supersetGroup).toBe(g);
    expect(await toggleWorkoutSuperset(db, w!.id, w!.exercises[4].id)).toBe(false);
    const w2 = await workoutDetailQuery(db, w!.id);
    expect(w2!.exercises.every((e) => e.supersetGroup == null)).toBe(true);
  });
});

describe('mover un día', () => {
  it('pasar la sesión de hoy a mañana y deshacer', async () => {
    const { db, days } = await setup();
    const today = '2026-11-03'; // martes, toca Día 1 (sin historial)
    await moveSession(db, today, '2026-11-04');
    let { plan, hasOverrides } = await getWeekPlan(db, today);
    expect(hasOverrides).toBe(true);
    expect(plan.todayEntry.status).toBe('descanso');
    expect(plan.next).toMatchObject({ date: '2026-11-04', label: 'Mañana' });
    expect(plan.next?.session?.id).toBe(days[0].id);
    await clearWeekOverrides(db, today);
    ({ plan } = await getWeekPlan(db, today));
    expect(plan.todayEntry.status).toBe('pendiente');
  });
});

describe('mapa muscular semanal', () => {
  it('cuenta series completadas por grupo (secundarios a la mitad)', async () => {
    const { db, days, p, finishAll } = await setup({ autoSetPlan: false });
    await finishAll(await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-02')));
    const map = await muscleMapSince(db, '2026-11-02');
    const pecho = map.find((c) => c.key === 'pecho')!;
    expect(pecho.sets).toBe(10); // banca 4 + inclinado 3 + aperturas 3
    expect(map.find((c) => c.key === 'triceps')!.sets).toBeGreaterThanOrEqual(8);
    expect(map.find((c) => c.key === 'pierna')!.level).toBe('nada');
  });
});
