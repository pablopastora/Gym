import { eq } from 'drizzle-orm';

import { exercise, profile, routineDay } from '@/db/schema';
import { runSeed, seedExerciseLibrary } from '@/db/seed';
import {
  createCustomExercise,
  deleteCustomExercise,
  exerciseUsage,
  updateCustomExercise,
  type CustomExerciseInput,
} from '@/repositories/exercises';
import { addRoutineExercise } from '@/repositories/routines';
import { completeSet, finishWorkout, startEmptyWorkout, addExerciseToWorkout, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

const base: CustomExerciseInput = {
  nameEs: 'Press en máquina Hammer de mi gimnasio',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'chest'],
  equipment: 'machine',
  kind: 'compuesto',
  defaultRestS: 120,
  techniqueNote: 'Asiento en la posición 5',
  instructions: ['Siéntate.', '', 'Empuja.'],
  customPhotoFile: 'mi_foto.jpg',
};

describe('ejercicios propios', () => {
  it('crear: región automática, secundarios sin duplicar, instrucciones limpias', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    const id = await createCustomExercise(db, base);
    const [ex] = await db.select().from(exercise).where(eq(exercise.id, id));
    expect(id).toMatch(/^u_/);
    expect(ex).toMatchObject({ source: 'usuario', isCustom: true, bodyRegion: 'superior', customPhotoFile: 'mi_foto.jpg', defaultRestS: 120 });
    expect(ex.secondaryMuscles).toEqual(['triceps']);
    expect(ex.instructions).toEqual(['Siéntate.', 'Empuja.']);
  });

  it('validación', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await expect(createCustomExercise(db, { ...base, nameEs: ' ' })).rejects.toThrow(/nombre/);
    await expect(createCustomExercise(db, { ...base, primaryMuscles: [] })).rejects.toThrow(/músculo/);
  });

  it('editar y sobrevivir a la actualización de la biblioteca', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    const id = await createCustomExercise(db, base);
    await updateCustomExercise(db, id, { ...base, nameEs: 'Sentadilla péndulo', primaryMuscles: ['quadriceps'] });
    await seedExerciseLibrary(db);
    const [ex] = await db.select().from(exercise).where(eq(exercise.id, id));
    expect(ex).toMatchObject({ nameEs: 'Sentadilla péndulo', bodyRegion: 'inferior' });
  });

  it('no se borra si está en una rutina o en el historial', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    const [p] = await db.select().from(profile);
    const id = await createCustomExercise(db, base);
    const [day] = await db.select().from(routineDay).limit(1);
    const reId = await addRoutineExercise(db, day.id, id);
    expect(await exerciseUsage(db, id)).toEqual({ routines: 1, workouts: 0 });
    expect(await deleteCustomExercise(db, id)).toBe(false);

    const id2 = await createCustomExercise(db, { ...base, nameEs: 'Otro' });
    const w = await startEmptyWorkout(db);
    await addExerciseToWorkout(db, w, id2, p);
    const detail = await workoutDetailQuery(db, w);
    await completeSet(db, detail!.exercises[0].sets[0].id, { weightKg: 50, reps: 10 });
    await finishWorkout(db, w);
    expect(await deleteCustomExercise(db, id2)).toBe(false);

    const id3 = await createCustomExercise(db, { ...base, nameEs: 'Sin usar' });
    expect(await deleteCustomExercise(db, id3)).toBe(true);
    expect(reId).toBeGreaterThan(0);
  });

  it('no permite borrar ejercicios de la biblioteca', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    expect(await deleteCustomExercise(db, 'Plank')).toBe(false);
  });
});
