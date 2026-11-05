import { asc, count, eq } from 'drizzle-orm';

import { profile, routine, routineDay, routineExercise, workout, workoutExercise, workoutSet } from '@/db/schema';
import { runSeed } from '@/db/seed';
import {
  addDay,
  addRoutineExercise,
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  moveRoutineExercise,
  routineWithDaysQuery,
  setActiveRoutine,
} from '@/repositories/routines';
import {
  addExerciseToWorkout,
  addSet,
  completeSet,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  getLastPerformance,
  moveWorkoutExercise,
  startWorkoutFromDay,
  substituteWorkoutExercise,
  workoutDetailQuery,
} from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

async function setup() {
  const { db } = createTestDb();
  await runSeed(db);
  // Estos tests cubren el modo manual (calentamientos según la rutina).
  await db.update(profile).set({ autoSetPlan: false });
  const [p] = await db.select().from(profile);
  const [day1] = await db.select().from(routineDay).orderBy(asc(routineDay.sortOrder)).limit(1);
  return { db, p, day1 };
}

describe('sesión de entrenamiento', () => {
  it('primera sesión: series con calentamientos y sin peso previo', async () => {
    const { db, p, day1 } = await setup();
    const id = await startWorkoutFromDay(db, day1.id, p, Date.UTC(2026, 10, 2, 18));
    const w = await workoutDetailQuery(db, id);
    expect(w!.exercises).toHaveLength(6);
    const bench = w!.exercises[0];
    expect(bench.exercise.nameEs).toBe('Press de banca con barra');
    expect(bench.restS).toBe(180); // descanso propio del press de banca
    expect(bench.sets.map((s) => s.setType)).toEqual(['calentamiento', 'calentamiento', 'normal', 'normal', 'normal', 'normal']);
    expect(bench.sets.every((s) => s.weightKg == null)).toBe(true);
    expect((await getActiveWorkout(db))?.id).toBe(id);
  });

  it('la siguiente sesión rellena peso y reps de la última vez y calcula calentamientos', async () => {
    const { db, p, day1 } = await setup();
    const id1 = await startWorkoutFromDay(db, day1.id, p, 1_000);
    const w1 = await workoutDetailQuery(db, id1);
    const benchSets = w1!.exercises[0].sets.filter((s) => s.setType === 'normal');
    const values = [
      [80, 8],
      [80, 8],
      [80, 7],
      [75, 8],
    ];
    for (const [i, s] of benchSets.entries()) {
      await completeSet(db, s.id, { weightKg: values[i][0], reps: values[i][1] });
    }
    expect(await finishWorkout(db, id1, 5_000)).toBe(4);

    // Tras terminar, solo queda el press de banca (ejercicios vacíos eliminados)
    const done = await workoutDetailQuery(db, id1);
    expect(done!.exercises).toHaveLength(1);
    expect(done!.endedAt).toBe(5_000);

    const last = await getLastPerformance(db, 'Barbell_Bench_Press_-_Medium_Grip');
    expect(last?.sets).toEqual([
      { weightKg: 80, reps: 8 },
      { weightKg: 80, reps: 8 },
      { weightKg: 80, reps: 7 },
      { weightKg: 75, reps: 8 },
    ]);

    const id2 = await startWorkoutFromDay(db, day1.id, p, 10_000);
    const w2 = await workoutDetailQuery(db, id2);
    const sets2 = w2!.exercises[0].sets;
    expect(sets2.map((s) => [s.setType, s.weightKg, s.reps])).toEqual([
      ['calentamiento', 40, 8],
      ['calentamiento', 60, 3],
      ['normal', 80, 8],
      ['normal', 80, 8],
      ['normal', 80, 7],
      ['normal', 75, 8],
    ]);
  });

  it('añadir serie copia la última; añadir, mover y sustituir ejercicios', async () => {
    const { db, p, day1 } = await setup();
    const id = await startWorkoutFromDay(db, day1.id, p);
    let w = await workoutDetailQuery(db, id);
    const we = w!.exercises[0];
    const lastSet = we.sets.at(-1)!;
    await completeSet(db, lastSet.id, { weightKg: 70, reps: 10 });
    const newSet = await addSet(db, we.id);
    const [ns] = await db.select().from(workoutSet).where(eq(workoutSet.id, newSet));
    expect([ns.weightKg, ns.reps, ns.completed]).toEqual([70, 10, false]);

    const added = await addExerciseToWorkout(db, id, 'Plank', p);
    await moveWorkoutExercise(db, id, added, -1);
    w = await workoutDetailQuery(db, id);
    expect(w!.exercises.at(-2)!.exercise.id).toBe('Plank');

    await substituteWorkoutExercise(db, we.id, 'Dumbbell_Bench_Press', p);
    w = await workoutDetailQuery(db, id);
    expect(w!.exercises[0].exercise.id).toBe('Dumbbell_Bench_Press');
  });

  it('descartar elimina la sesión y sus series', async () => {
    const { db, p, day1 } = await setup();
    const id = await startWorkoutFromDay(db, day1.id, p);
    await discardWorkout(db, id);
    expect(await getActiveWorkout(db)).toBeNull();
    const [{ n }] = await db.select({ n: count() }).from(workoutSet);
    expect(n).toBe(0);
    const [{ m }] = await db.select({ m: count() }).from(workoutExercise);
    expect(m).toBe(0);
  });

  it('borrar una rutina no borra el historial', async () => {
    const { db, p, day1 } = await setup();
    const id = await startWorkoutFromDay(db, day1.id, p);
    await finishWorkout(db, id);
    await db.delete(routine);
    const [w] = await db.select().from(workout).where(eq(workout.id, id));
    expect(w.routineDayId).toBeNull();
  });
});

describe('editor de rutinas', () => {
  it('crear, añadir ejercicios, reordenar, duplicar, activar y borrar', async () => {
    const { db } = await setup();
    const rid = await createRoutine(db, 'Torso/Pierna');
    const r0 = await routineWithDaysQuery(db, rid);
    expect(r0!.days).toHaveLength(1);
    const dayId = r0!.days[0].id;
    const a = await addRoutineExercise(db, dayId, 'Barbell_Squat');
    await addRoutineExercise(db, dayId, 'Leg_Extensions');
    await moveRoutineExercise(db, a, 1);
    await addDay(db, rid);
    let r = await routineWithDaysQuery(db, rid);
    expect(r!.days.map((d) => d.name)).toEqual(['Día 1', 'Día 2']);
    expect(r!.days[0].exercises.map((e) => e.exerciseId)).toEqual(['Leg_Extensions', 'Barbell_Squat']);
    expect(r!.days[0].exercises[1]).toMatchObject({ sets: 3, repMin: 5, repMax: 8, warmupSets: 2 }); // esquema de «básico» en déficit

    const copy = await duplicateRoutine(db, rid);
    r = await routineWithDaysQuery(db, copy);
    expect(r!.name).toBe('Torso/Pierna (copia)');
    expect(r!.days[0].exercises).toHaveLength(2);

    await setActiveRoutine(db, copy);
    const actives = await db.select().from(routine).where(eq(routine.isActive, true));
    expect(actives.map((x) => x.id)).toEqual([copy]);

    await deleteRoutine(db, copy);
    const actives2 = await db.select().from(routine).where(eq(routine.isActive, true));
    expect(actives2).toHaveLength(1);
    const [{ n }] = await db.select({ n: count() }).from(routineExercise).where(eq(routineExercise.routineDayId, dayId));
    expect(n).toBe(2);
  });
});
