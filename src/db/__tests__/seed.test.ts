import { count, eq } from 'drizzle-orm';

import { CURATED } from '@/data/curated';
import { DEFAULT_ROUTINE } from '@/data/defaultRoutine';
import { buildExerciseLibrary } from '@/data/library';
import { exercise, profile, routine, routineDay, routineExercise } from '@/db/schema';
import { runSeed, seedExerciseLibrary } from '@/db/seed';
import { createTestDb } from '@/test/testDb';

describe('datos iniciales', () => {
  it('todas las fichas curadas y la rutina por defecto apuntan a ejercicios existentes', () => {
    const ids = new Set(buildExerciseLibrary().map((e) => e.id));
    for (const id of Object.keys(CURATED)) expect(ids).toContain(id);
    for (const day of DEFAULT_ROUTINE) for (const e of day.exercises) expect(ids).toContain(e.exerciseId);
  });

  it('crea perfil, biblioteca y rutina por defecto, y es idempotente', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await runSeed(db);

    const [p] = await db.select().from(profile);
    expect(p).toMatchObject({ id: 1, heightCm: 185, startWeightKg: 95, incrementUpperKg: 2.5, incrementLowerKg: 5 });

    const [{ n: nEx }] = await db.select({ n: count() }).from(exercise);
    expect(nEx).toBe(buildExerciseLibrary().length);

    const routines = await db.select().from(routine);
    expect(routines).toHaveLength(1);
    expect(routines[0].isActive).toBe(true);

    const days = await db.select().from(routineDay).where(eq(routineDay.routineId, routines[0].id));
    expect(days).toHaveLength(5);
    expect(days.filter((d) => d.isOptional)).toHaveLength(1);

    const [{ n: nRe }] = await db.select({ n: count() }).from(routineExercise);
    expect(nRe).toBe(DEFAULT_ROUTINE.reduce((s, d) => s + d.exercises.length, 0));
  });

  it('las fichas curadas quedan en español y los JSON se leen como arrays', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    const [bench] = await db.select().from(exercise).where(eq(exercise.id, 'Barbell_Bench_Press_-_Medium_Grip'));
    expect(bench.nameEs).toBe('Press de banca con barra');
    expect(bench.curated).toBe(true);
    expect(bench.kind).toBe('compuesto');
    expect(bench.bodyRegion).toBe('superior');
    expect(bench.primaryMuscles).toContain('chest');
    expect(bench.commonErrors.length).toBeGreaterThan(0);

    const [squat] = await db.select().from(exercise).where(eq(exercise.id, 'Barbell_Squat'));
    expect(squat.bodyRegion).toBe('inferior');
  });

  it('al actualizar la biblioteca se conservan los favoritos', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await db.update(exercise).set({ isFavorite: true }).where(eq(exercise.id, 'Barbell_Squat'));
    await seedExerciseLibrary(db);
    const [squat] = await db.select().from(exercise).where(eq(exercise.id, 'Barbell_Squat'));
    expect(squat.isFavorite).toBe(true);
  });

  it('borrar una rutina elimina en cascada días y ejercicios', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await db.delete(routine);
    const [{ n }] = await db.select({ n: count() }).from(routineExercise);
    expect(n).toBe(0);
  });
});
