import { asc, eq } from 'drizzle-orm';

import { profile, routineDay, routineExercise, routineSuggestion, workout, workoutSet } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { acceptSuggestion, ensureWeeklySuggestions, pendingSuggestionsQuery, rejectSuggestion } from '@/repositories/adapt';
import { getWeekPlan } from '@/repositories/plan';
import { completeSet, finishWorkout, saveWorkoutEdits, startEmptyWorkout, startWorkoutFromDay, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

const at = (date: string, hour = 18) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0).getTime();
};

async function setup() {
  const { db } = createTestDb();
  await runSeed(db);
  const days = await db.select().from(routineDay).orderBy(asc(routineDay.sortOrder));
  const p = async () => (await db.select().from(profile))[0];
  /** Entreno del día de rutina `n` (1-based) en `date`; completa todas sus series con sus valores o 20 × 12. */
  const train = async (n: number, date: string, hour = 18, values?: Record<string, [number, number]>) => {
    const id = await startWorkoutFromDay(db, days[n - 1].id, await p(), at(date, hour));
    const w = await workoutDetailQuery(db, id);
    for (const we of w!.exercises) {
      for (const s of we.sets.filter((x) => x.setType === 'normal')) {
        const [kg, reps] = values?.[we.exerciseId] ?? [s.weightKg ?? 20, s.reps ?? 12];
        await completeSet(db, s.id, { weightKg: kg, reps });
      }
    }
    await finishWorkout(db, id, at(date, hour) + 3_600_000);
    return id;
  };
  return { db, days, train, p };
}

describe('«hoy» tras entrenar (bug del Día 2 repetido)', () => {
  it('terminar el entreno de hoy lo marca completado y la siguiente sesión pasa a «Mañana»', async () => {
    const { db, days, train } = await setup();
    await train(1, '2026-11-02'); // lunes Día 1
    let { plan } = await getWeekPlan(db, '2026-11-03'); // martes, antes de entrenar
    expect(plan.todayEntry.status).toBe('pendiente');
    expect(plan.todayEntry.session?.id).toBe(days[1].id);

    await train(2, '2026-11-03');
    ({ plan } = await getWeekPlan(db, '2026-11-03'));
    expect(plan.todayEntry.status).toBe('completado');
    expect(plan.todayEntry.workouts.map((w) => w.name)).toEqual([days[1].name]);
    expect(plan.next?.session?.id).toBe(days[2].id); // Día 3, no el Día 2
    expect(plan.next?.label).toBe('Jueves'); // miércoles es descanso con 4 días
  });

  it('al cruzar la medianoche, hoy pasa a la siguiente sesión', async () => {
    const { db, days, train } = await setup();
    await train(1, '2026-11-02', 23); // lunes 23:00 → termina a las 00:00 del martes
    const { plan } = await getWeekPlan(db, '2026-11-03');
    expect(plan.days.find((d) => d.date === '2026-11-02')?.status).toBe('completado');
    expect(plan.todayEntry).toMatchObject({ label: 'Hoy', status: 'pendiente' });
    expect(plan.todayEntry.session?.id).toBe(days[1].id);
  });

  it('saltarse un día: el día perdido queda marcado y no se salta la sesión', async () => {
    const { db, days, train } = await setup();
    await train(1, '2026-11-02');
    const { plan } = await getWeekPlan(db, '2026-11-05'); // jueves; martes sin entrenar
    expect(plan.days.find((d) => d.date === '2026-11-03')?.status).toBe('perdido');
    expect(plan.todayEntry.session?.id).toBe(days[1].id);
  });

  it('un entreno libre no reinicia la rotación', async () => {
    const { db, days, train } = await setup();
    await train(1, '2026-11-02');
    const free = await startEmptyWorkout(db, at('2026-11-03'));
    await finishWorkout(db, free, at('2026-11-03') + 600_000);
    const { plan } = await getWeekPlan(db, '2026-11-05');
    expect(plan.todayEntry.session?.id).toBe(days[1].id);
  });

  it('días de entreno personalizados', async () => {
    const { db } = await setup();
    await db.update(profile).set({ trainingWeekdays: [2, 4, 6, 7] });
    const { plan } = await getWeekPlan(db, '2026-11-02'); // lunes
    expect(plan.todayEntry.status).toBe('descanso');
    expect(plan.next?.label).toBe('Mañana');
  });
});

describe('kcal', () => {
  it('se guardan al terminar y se recalculan al editar', async () => {
    const { db, train } = await setup();
    const id = await train(1, '2026-11-02');
    const [w] = await db.select().from(workout).where(eq(workout.id, id));
    expect(w.kcal).toBeGreaterThan(100);
    expect(w.met).toBeGreaterThanOrEqual(3.5);
    // Editar: quitar casi todas las series → menos kcal
    const d = await workoutDetailQuery(db, id);
    const all = d!.exercises.flatMap((e) => e.sets);
    for (const s of all.slice(3)) await db.delete(workoutSet).where(eq(workoutSet.id, s.id));
    await saveWorkoutEdits(db, id);
    const [w2] = await db.select().from(workout).where(eq(workout.id, id));
    expect(w2.kcal!).toBeLessThan(w.kcal!);
  });
});

describe('sugerencias semanales', () => {
  // Aperturas en polea (Día 1, 3 × 12-15) estancadas en 20 kg × 12 tres semanas.
  const stuck = { Flat_Bench_Cable_Flyes: [20, 12] as [number, number] };

  it('se generan una sola vez por semana, se aceptan y se aplican a la rutina', async () => {
    const { db, days, train, p } = await setup();
    for (const d of ['2026-10-26', '2026-11-02', '2026-11-09']) await train(1, d, 18, stuck);
    expect(await ensureWeeklySuggestions(db, '2026-11-16', at('2026-11-16'))).toBeGreaterThan(0);
    expect(await ensureWeeklySuggestions(db, '2026-11-18', at('2026-11-18'))).toBe(0); // misma semana

    const pending = await pendingSuggestionsQuery(db);
    const s = pending.find((x) => x.rule === 'refuerzo' && x.exerciseId === 'Flat_Bench_Cable_Flyes')!;
    expect(s).toBeDefined();
    expect(await acceptSuggestion(db, s.id, at('2026-11-16'))).toBe(true);

    const res = await db.select().from(routineExercise).where(eq(routineExercise.routineDayId, days[0].id));
    expect(res.map((r) => r.exerciseId)).toContain(s.suggestedExerciseId);
    expect(res.map((r) => r.exerciseId)).not.toContain('Flat_Bench_Cable_Flyes');
    const [hist] = await db.select().from(routineSuggestion).where(eq(routineSuggestion.id, s.id));
    expect(hist).toMatchObject({ status: 'aceptada' });
    expect(hist.appliedSummary).toMatch(/→/);

    // La próxima sesión del Día 1 ya usa el ejercicio nuevo.
    const w = await startWorkoutFromDay(db, days[0].id, await p(), at('2026-11-16'));
    const det = await workoutDetailQuery(db, w);
    expect(det!.exercises.map((e) => e.exerciseId)).toContain(s.suggestedExerciseId);
  });

  it('rechazar: no se repite la semana siguiente; las pendientes antiguas caducan', async () => {
    const { db, train } = await setup();
    for (const d of ['2026-10-26', '2026-11-02', '2026-11-09']) await train(1, d, 18, stuck);
    await ensureWeeklySuggestions(db, '2026-11-16', at('2026-11-16'));
    const pending = await pendingSuggestionsQuery(db);
    const s = pending.find((x) => x.exerciseId === 'Flat_Bench_Cable_Flyes')!;
    await rejectSuggestion(db, s.id, at('2026-11-16'));
    await train(1, '2026-11-16', 18, stuck);

    await ensureWeeklySuggestions(db, '2026-11-23', at('2026-11-23'));
    const all = await db.select().from(routineSuggestion);
    expect(all.filter((x) => x.exerciseId === 'Flat_Bench_Cable_Flyes' && x.weekStart === '2026-11-23')).toHaveLength(0);
    expect(all.filter((x) => x.weekStart === '2026-11-16' && x.status === 'pendiente')).toHaveLength(0);
  });

  it('si la rutina cambió, aceptar una sugerencia obsoleta la marca caducada', async () => {
    const { db, train } = await setup();
    for (const d of ['2026-10-26', '2026-11-02', '2026-11-09']) await train(1, d, 18, stuck);
    await ensureWeeklySuggestions(db, '2026-11-16', at('2026-11-16'));
    const s = (await pendingSuggestionsQuery(db)).find((x) => x.exerciseId === 'Flat_Bench_Cable_Flyes')!;
    await db.update(routineExercise).set({ exerciseId: 'Butterfly' }).where(eq(routineExercise.id, s.routineExerciseId!));
    expect(await acceptSuggestion(db, s.id)).toBe(false);
    const [row] = await db.select().from(routineSuggestion).where(eq(routineSuggestion.id, s.id));
    expect(row.status).toBe('caducada');
  });
});
