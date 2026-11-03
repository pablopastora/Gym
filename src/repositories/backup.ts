import { asc, eq } from 'drizzle-orm';

import { journal } from '@/db/migrations';
import * as schema from '@/db/schema';
import type { AppDb } from '@/db/types';
import { BACKUP_TABLES, buildBackup, type BackupFile, type BackupTable, type BackupTables } from '@/domain/backup';
import { runSeed } from '@/db/seed';

/** Versión del esquema = número de migraciones aplicadas. */
export const SCHEMA_VERSION = journal.entries.length;

const TABLES: Record<BackupTable, any> = {
  appMeta: schema.appMeta,
  profile: schema.profile,
  exercise: schema.exercise,
  routine: schema.routine,
  routineDay: schema.routineDay,
  routineExercise: schema.routineExercise,
  workout: schema.workout,
  workoutExercise: schema.workoutExercise,
  workoutSet: schema.workoutSet,
  exerciseProgress: schema.exerciseProgress,
  personalRecord: schema.personalRecord,
  bodyWeight: schema.bodyWeight,
  bodyMeasurement: schema.bodyMeasurement,
  progressPhoto: schema.progressPhoto,
  cardioSession: schema.cardioSession,
  reminder: schema.reminder,
  routineSuggestion: schema.routineSuggestion,
};

export async function exportAll(db: AppDb): Promise<BackupFile> {
  const tables = {} as BackupTables;
  for (const t of BACKUP_TABLES) tables[t] = (await db.select().from(TABLES[t])) as Record<string, unknown>[];
  return buildBackup(tables, SCHEMA_VERSION);
}

/**
 * Sustituye TODOS los datos por los de la copia (decisión 7a). Borra en orden
 * inverso e inserta en orden para respetar las claves ajenas. Después normaliza
 * con runSeed (perfil y biblioteca al día). Quien llama debe haber guardado
 * antes una copia automática para poder deshacer.
 */
export async function importAll(db: AppDb, backup: BackupFile) {
  for (const t of [...BACKUP_TABLES].reverse()) await db.delete(TABLES[t]);
  for (const t of BACKUP_TABLES) {
    const rows = backup.tables[t];
    for (let i = 0; i < rows.length; i += 25) await db.insert(TABLES[t]).values(rows.slice(i, i + 25));
  }
  await runSeed(db);
}

// ───────────── Datos para CSV ─────────────

export async function setsForCsv(db: AppDb) {
  const { workout, workoutExercise, workoutSet, exercise } = schema;
  return db
    .select({
      date: workout.date,
      workout: workout.name,
      deload: workout.isDeload,
      exercise: exercise.nameEs,
      setNo: workoutSet.sortOrder,
      type: workoutSet.setType,
      kg: workoutSet.weightKg,
      reps: workoutSet.reps,
      rir: workoutSet.rir,
      rpe: workoutSet.rpe,
      notes: workoutExercise.notes,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(eq(workoutSet.completed, true))
    .orderBy(asc(workout.startedAt), asc(workoutExercise.sortOrder), asc(workoutSet.sortOrder));
}
