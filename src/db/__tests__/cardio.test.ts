import { eq } from 'drizzle-orm';

import { appMeta, bodyWeight, cardioSession, profile, workout, workoutExercise } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { addCardio, cardioLoggedAsStrength, convertExerciseToCardio, updateCardio } from '@/repositories/cardio';
import { activityByDay, backfillKcal, paceFromNotes, weeklyKcal } from '@/repositories/kcal';
import { addExerciseToWorkout, completeSet, finishWorkout, startEmptyWorkout, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

const at = (date: string, h = 18) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, h).getTime();
};

async function setup() {
  const { db } = createTestDb();
  await runSeed(db);
  await db.insert(bodyWeight).values({ date: '2026-11-01', weightKg: 95 });
  const p = (await db.select().from(profile))[0];
  return { db, p };
}

describe('cardio: kcal guardadas y sumadas', () => {
  it('30 min de cinta sin entreno de fuerza cuentan en el día y en la semana', async () => {
    const { db } = await setup();
    const res = await addCardio(db, { date: '2026-11-05', type: 'Cinta', durationMin: 30, speedKmh: 5.5, inclinePct: 5 });
    expect(res.kcal).toBe(298);
    const [c] = await db.select().from(cardioSession);
    expect(c).toMatchObject({ kcal: 298, kcalMethod: 'acsm', speedKmh: 5.5, inclinePct: 5 });
    const day = (await activityByDay(db, '2026-11-05', '2026-11-05')).get('2026-11-05');
    expect(day).toMatchObject({ cardioKcal: 298, cardioMin: 30, strengthKcal: 0 });
    const weeks = await weeklyKcal(db, '2026-11-05', 2);
    expect(weeks.at(-1)).toMatchObject({ cardio: 298, total: 298 });
  });

  it('editar recalcula las kcal', async () => {
    const { db } = await setup();
    const { id } = await addCardio(db, { date: '2026-11-05', type: 'Elíptica', durationMin: 30, intensity: 'moderada' });
    expect((await db.select().from(cardioSession))[0].kcal).toBe(238);
    await updateCardio(db, id, { date: '2026-11-05', type: 'Elíptica', durationMin: 60, intensity: 'moderada' });
    expect((await db.select().from(cardioSession))[0].kcal).toBe(475);
  });

  it('registros antiguos se recalculan con la nueva fórmula, aprovechando velocidad y pendiente de las notas', async () => {
    const { db } = await setup();
    await db.insert(cardioSession).values({ date: '2026-11-05', type: 'Cinta inclinada', durationMin: 30, notes: 'Inclinación 5 %, 5,5 km/h', kcal: 285 });
    await backfillKcal(db);
    const [c] = await db.select().from(cardioSession);
    expect(c).toMatchObject({ kcal: 298, kcalMethod: 'acsm', speedKmh: 5.5, inclinePct: 5 });
    expect(paceFromNotes('6 km/h')).toEqual({ speedKmh: 6, inclinePct: null });
  });
});

describe('ejercicios de cardio de la biblioteca dentro de un entreno', () => {
  it('no cuentan como fuerza y se pueden convertir en cardio', async () => {
    const { db, p } = await setup();
    const wid = await startEmptyWorkout(db, at('2026-11-05'));
    await addExerciseToWorkout(db, wid, 'Walking_Treadmill', p);
    const w = await workoutDetailQuery(db, wid);
    const we = w!.exercises[0];
    await completeSet(db, we.sets[0].id, { weightKg: 0, reps: 30 });
    await finishWorkout(db, wid, at('2026-11-05', 19));
    // Las «series» de cinta no inflan las kcal de fuerza.
    expect((await db.select().from(workout).where(eq(workout.id, wid)))[0].kcal).toBe(0);

    const pending = await cardioLoggedAsStrength(db);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ type: 'Cinta', guessMin: 30, date: '2026-11-05' });

    await convertExerciseToCardio(db, pending[0].workoutExerciseId, { date: '2026-11-05', type: 'Cinta', durationMin: 30, speedKmh: 5.5, inclinePct: 5 });
    expect(await cardioLoggedAsStrength(db)).toHaveLength(0);
    expect(await db.select().from(workoutExercise).where(eq(workoutExercise.workoutId, wid))).toHaveLength(0);
    const [c] = await db.select().from(cardioSession);
    expect(c).toMatchObject({ workoutId: wid, kcal: 298, durationMin: 30 });
  });
});

describe('al arrancar tras actualizar', () => {
  it('runSeed recalcula una vez los cardios antiguos aunque ya se hubiera hecho el cálculo v1', async () => {
    const { db } = await setup();
    // Móvil con la versión anterior: solo tenía la marca v1.
    await db.delete(appMeta).where(eq(appMeta.key, 'kcal_backfill_v2'));
    await db.insert(appMeta).values({ key: 'kcal_backfill_v1', value: '1' }).onConflictDoNothing();
    await db.insert(cardioSession).values({ date: '2026-11-05', type: 'Cinta', durationMin: 30, notes: '5,5 km/h 5 %', kcal: 333 });
    await runSeed(db);
    expect((await db.select().from(cardioSession))[0]).toMatchObject({ kcal: 298, kcalMethod: 'acsm' });
  });
});
