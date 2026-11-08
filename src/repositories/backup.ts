import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { journal } from '@/db/migrations';
import * as schema from '@/db/schema';
import type { AppDb } from '@/db/types';
import { BACKUP_TABLES, buildBackup, diaryCsv, foodsCsv, goalsCsv, recipesCsv, toCsv, type BackupFile, type BackupTable, type BackupTables } from '@/domain/backup';
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
  dayOverride: schema.dayOverride,
  energyAdjustment: schema.energyAdjustment,
  food: schema.food,
  recipeItem: schema.recipeItem,
  diaryEntry: schema.diaryEntry,
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

/** CSV de nutrición: diario, alimentos propios/usados, recetas, objetivos y ajustes del gasto. */
export async function nutritionCsv(db: AppDb): Promise<Record<string, string>> {
  const { diaryEntry, food, recipeItem, profile, energyAdjustment } = schema;
  const entries = await db.select().from(diaryEntry).orderBy(asc(diaryEntry.date), asc(diaryEntry.sortOrder));
  const foods = (await db.select().from(food).orderBy(asc(food.name))).filter(
    // La lista básica completa no aporta: solo los alimentos propios, de Open Food Facts, recetas o los que has tocado.
    (f) => f.source !== 'base' || f.edited || f.isFavorite || f.lastUsedAt != null || (f as { pref?: string | null }).pref || (f as { inPantry?: boolean }).inPantry,
  );
  const ingredient = alias(food, 'ingredient');
  const recipes = await db
    .select({ recipe: food.name, servings: food.servings, ingredient: ingredient.name, grams: recipeItem.grams })
    .from(recipeItem)
    .innerJoin(food, eq(food.id, recipeItem.recipeId))
    .innerJoin(ingredient, eq(ingredient.id, recipeItem.foodId))
    .orderBy(asc(food.name), asc(recipeItem.sortOrder));
  const [p] = await db.select().from(profile);
  const adjustments = await db.select().from(energyAdjustment).orderBy(asc(energyAdjustment.id));
  return {
    'comidas.csv': diaryCsv(entries),
    'alimentos.csv': foodsCsv(foods),
    'recetas.csv': recipesCsv(recipes),
    'objetivos.csv': goalsCsv(nutritionGoalPairs(p)),
    'ajustes_gasto.csv': toCsv(
      ['fecha', 'desde', 'hasta', 'dias_registrados', 'ingesta_media', 'gasto_estimado', 'cambio_peso_kg', 'gasto_observado', 'ajuste_kcal', 'estado'],
      adjustments.map((a) => [a.createdDate, a.fromDate, a.toDate, a.loggedDays, a.avgIntake, a.avgEstimated, a.weightChangeKg, a.observedTdee, a.deltaKcal, a.status]),
    ),
  };
}

/** Objetivos y preferencias de nutrición del perfil, como pares clave/valor. */
export function nutritionGoalPairs(p: typeof schema.profile.$inferSelect): [string, string | number | boolean | null][] {
  return [
    ['actividad', p.activityLevel],
    ['ritmo_kg_semana', p.targetRateKgWeek ?? 'según objetivo'],
    ['objetivo_kcal_manual', p.kcalTargetManual],
    ['proteina_g_kg', p.proteinGPerKg],
    ['grasas_g_kg', p.fatGPerKg],
    ['recalibracion_kcal', p.tdeeAdjustKcal],
    ['peso_objetivo_kg', p.goalWeightKg],
    ['fecha_objetivo', p.goalDate],
  ];
}
