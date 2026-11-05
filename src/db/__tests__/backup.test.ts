import { count } from 'drizzle-orm';

import { exercise, profile, routine, routineDay, workout } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { validateBackup } from '@/domain/backup';
import { exportAll, importAll, SCHEMA_VERSION, setsForCsv } from '@/repositories/backup';
import { addPhotoRecord, upsertMeasurement, upsertWeight } from '@/repositories/body';
import { createCustomExercise } from '@/repositories/exercises';
import { createRoutine } from '@/repositories/routines';
import { completeSet, finishWorkout, startWorkoutFromDay, workoutDetailQuery } from '@/repositories/workouts';
import { createTestDb } from '@/test/testDb';

async function populated() {
  const { db } = createTestDb();
  await runSeed(db);
  await db.update(profile).set({ autoSetPlan: false }); // modo manual (índices de series fijos)
  const [p] = await db.select().from(profile);
  const [day] = await db.select().from(routineDay).limit(1);
  const w = await startWorkoutFromDay(db, day.id, p, Date.UTC(2026, 10, 2, 18));
  const d = await workoutDetailQuery(db, w);
  await completeSet(db, d!.exercises[0].sets[2].id, { weightKg: 80, reps: 8, rir: 2 });
  await finishWorkout(db, w);
  await upsertWeight(db, '2026-11-02', 94.8);
  await upsertMeasurement(db, '2026-11-02', { waistCm: 102 });
  await addPhotoRecord(db, '2026-11-02', 'frontal', 'a.jpg');
  await createCustomExercise(db, {
    nameEs: 'Mi máquina',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'machine',
    kind: 'accesorio',
    defaultRestS: null,
    techniqueNote: null,
    instructions: [],
    customPhotoFile: null,
  });
  return db;
}

describe('exportar e importar', () => {
  it('ida y vuelta: importar una copia deja los datos idénticos', async () => {
    const db = await populated();
    const backup = JSON.parse(JSON.stringify(await exportAll(db)));
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    const v = validateBackup(backup, SCHEMA_VERSION);
    expect(v.ok).toBe(true);

    // Otro móvil con datos distintos: se sustituyen por los de la copia (7a).
    const { db: other } = createTestDb();
    await runSeed(other);
    await createRoutine(other, 'Rutina que debe desaparecer');
    await upsertWeight(other, '2026-01-01', 120);
    if (v.ok) await importAll(other, v.backup);

    const again = JSON.parse(JSON.stringify(await exportAll(other)));
    for (const t of Object.keys(backup.tables)) expect([t, again.tables[t]]).toEqual([t, backup.tables[t]]);
    const routines = await other.select().from(routine);
    expect(routines.map((r) => r.name)).not.toContain('Rutina que debe desaparecer');
  });

  it('una copia de un esquema anterior (sin columnas nuevas) se importa con valores por defecto', async () => {
    const db = await populated();
    const backup = JSON.parse(JSON.stringify(await exportAll(db)));
    for (const e of backup.tables.exercise) {
      delete e.videoAttribution;
      delete e.videoCheckedAt;
    }
    delete backup.tables.reminder;
    backup.schemaVersion = SCHEMA_VERSION - 1;
    const v = validateBackup(backup, SCHEMA_VERSION);
    expect(v.ok).toBe(true);
    const { db: other } = createTestDb();
    await runSeed(other);
    if (v.ok) await importAll(other, v.backup);
    const [{ n }] = await other.select({ n: count() }).from(workout);
    expect(n).toBe(1);
    const [{ e }] = await other.select({ e: count() }).from(exercise);
    expect(e).toBeGreaterThan(870);
  });

  it('series para CSV: solo completadas y con nombre en español', async () => {
    const db = await populated();
    const rows = await setsForCsv(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: '2026-11-02', exercise: 'Press de banca con barra', kg: 80, reps: 8, rir: 2, type: 'normal' });
  });
});
