import { asc, eq } from 'drizzle-orm';

import { profile, routineDay } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { getAllRecords, getDeloadStatus, getPreviousBests, recordsInWorkout, startDeload } from '@/repositories/progress';
import { applyWeightDrop, completeSet, finishWorkout, startWorkoutFromDay, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

const DAY = 24 * 3600 * 1000;
const T0 = Date.UTC(2026, 9, 5, 17); // lunes 5 oct 2026

async function setup() {
  const { db } = createTestDb();
  await runSeed(db);
  const [day1] = await db.select().from(routineDay).orderBy(asc(routineDay.sortOrder)).limit(1);
  const getProfile = async () => (await db.select().from(profile))[0];
  return { db, day1, getProfile };
}

/** Hace una sesión del día 1 registrando solo el press de banca con las reps dadas. */
async function doBench(ctx: Awaited<ReturnType<typeof setup>>, at: number, weight: number | null, reps: number[]) {
  const { db, day1, getProfile } = ctx;
  const id = await startWorkoutFromDay(db, day1.id, await getProfile(), at);
  const w = await workoutDetailQuery(db, id);
  const bench = w!.exercises[0];
  const working = bench.sets.filter((s) => s.setType === 'normal');
  for (const [i, s] of working.entries()) {
    if (reps[i] == null) continue;
    await completeSet(db, s.id, { weightKg: weight ?? s.weightKg, reps: reps[i] }, at + 60_000);
  }
  await finishWorkout(db, id, at + 3_600_000);
  return id;
}

async function nextBench(ctx: Awaited<ReturnType<typeof setup>>, at: number) {
  const id = await startWorkoutFromDay(ctx.db, ctx.day1.id, await ctx.getProfile(), at);
  return (await workoutDetailQuery(ctx.db, id))!.exercises[0];
}

describe('progresión al empezar la sesión (opción 4a)', () => {
  it('techo en todas las series → la sesión sale ya con +2,5 kg, reps al mínimo y calentamientos recalculados', async () => {
    const ctx = await setup();
    await doBench(ctx, T0, 80, [8, 8, 8, 8]); // press banca 4 × 6-8
    const bench = await nextBench(ctx, T0 + 7 * DAY);
    expect(bench.progressionAction).toBe('subir');
    expect(bench.progressionDeltaKg).toBe(2.5);
    expect(bench.targetWeightKg).toBe(82.5);
    expect(bench.sets.map((s) => [s.setType, s.weightKg, s.reps])).toEqual([
      ['calentamiento', 42.5, 8],
      ['calentamiento', 62.5, 3],
      ['normal', 82.5, 6],
      ['normal', 82.5, 6],
      ['normal', 82.5, 6],
      ['normal', 82.5, 6],
    ]);
  });

  it('fallar el mínimo mantiene el peso y las reps de la última vez (no baja)', async () => {
    const ctx = await setup();
    await doBench(ctx, T0, 80, [6, 5, 5, 4]);
    const bench = await nextBench(ctx, T0 + 7 * DAY);
    expect(bench.progressionAction).toBe('mantener');
    expect(bench.sets.filter((s) => s.setType === 'normal').map((s) => s.weightKg)).toEqual([80, 80, 80, 80]);
  });

  it('3 sesiones estancadas → sugiere bajar, y el −10 % solo se aplica si el usuario lo pide', async () => {
    const ctx = await setup();
    await doBench(ctx, T0, 80, [7, 6, 6, 6]);
    await doBench(ctx, T0 + 7 * DAY, 80, [7, 6, 6, 6]);
    await doBench(ctx, T0 + 14 * DAY, 80, [7, 6, 6, 5]);
    await doBench(ctx, T0 + 21 * DAY, 80, [6, 6, 6, 5]);
    const bench = await nextBench(ctx, T0 + 28 * DAY);
    expect(bench.progressionAction).toBe('estancado');
    expect(bench.sets.filter((s) => s.setType === 'normal').every((s) => s.weightKg === 80)).toBe(true);
    await applyWeightDrop(ctx.db, bench.id);
    const after = (await workoutDetailQuery(ctx.db, bench.workoutId))!.exercises[0];
    expect(after.sets.filter((s) => s.setType === 'normal').map((s) => s.weightKg)).toEqual([72.5, 72.5, 72.5, 72.5]);
  });
});

describe('descarga', () => {
  it('semana de descarga: mitad de series, mismo peso, marcada y fuera del cálculo de progresión', async () => {
    const ctx = await setup();
    await doBench(ctx, T0, 80, [8, 8, 8, 8]);
    await startDeload(ctx.db, '2026-10-12');
    const p = await ctx.getProfile();
    expect(p.deloadUntil).toBe('2026-10-18');
    const bench = await nextBench(ctx, Date.UTC(2026, 9, 12, 17));
    expect(bench.progressionAction).toBe('descarga');
    const working = bench.sets.filter((s) => s.setType === 'normal');
    expect(working).toHaveLength(2);
    expect(working.every((s) => s.weightKg === 80)).toBe(true);
    for (const s of working) await completeSet(ctx.db, s.id, { weightKg: 80, reps: 5 });
    await finishWorkout(ctx.db, bench.workoutId);

    // Tras la descarga, la progresión ignora esa sesión: sigue tocando subir.
    await ctx.db.update(profile).set({ deloadUntil: null });
    const next = await nextBench(ctx, Date.UTC(2026, 9, 19, 17));
    expect(next.progressionAction).toBe('subir');
  });

  it('estado: sugerida a las 6 semanas, activa tras empezarla', async () => {
    const ctx = await setup();
    await doBench(ctx, T0, 80, [8, 8, 8, 8]);
    const p = await ctx.getProfile();
    expect((await getDeloadStatus(ctx.db, p, '2026-11-02')).state).toBe('no');
    expect((await getDeloadStatus(ctx.db, p, '2026-11-16')).state).toBe('sugerida');
    await startDeload(ctx.db, '2026-11-16');
    expect((await getDeloadStatus(ctx.db, await ctx.getProfile(), '2026-11-17')).state).toBe('activa');
  });
});

describe('récords', () => {
  it('detecta récords por sesión y las mejores marcas previas', async () => {
    const ctx = await setup();
    const w1 = await doBench(ctx, T0, 80, [8, 8, 7, 7]);
    const w2 = await doBench(ctx, T0 + 7 * DAY, 80, [8, 8, 8, 8]);
    expect(await recordsInWorkout(ctx.db, w1)).toEqual([]); // primera sesión = base
    const r2 = await recordsInWorkout(ctx.db, w2);
    expect(r2).toEqual([{ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', types: ['volumen'] }]);

    const bests = await getPreviousBests(ctx.db, ['Barbell_Bench_Press_-_Medium_Grip'], -1);
    expect(bests['Barbell_Bench_Press_-_Medium_Grip'].maxWeight).toBe(80);
    expect(bests['Barbell_Bench_Press_-_Medium_Grip'].bestE1rm).toBeCloseTo(101.33, 1);

    const all = await getAllRecords(ctx.db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ nameEs: 'Press de banca con barra', sessions: 2 });
    expect(all[0].records.volumen?.workoutId).toBe(w2);
  });

  it('no hay récords con el historial vacío', async () => {
    const ctx = await setup();
    expect(await getAllRecords(ctx.db)).toEqual([]);
    const [p] = await ctx.db.select().from(profile).where(eq(profile.id, 1));
    expect((await getDeloadStatus(ctx.db, p, '2026-11-02')).state).toBe('no');
  });
});
