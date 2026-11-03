import { eq, sql } from 'drizzle-orm';

import { DEFAULT_ROUTINE, DEFAULT_ROUTINE_NAME } from '@/data/defaultRoutine';
import { buildExerciseLibrary } from '@/data/library';

import { appMeta, exercise, profile, routine, routineDay, routineExercise } from './schema';
import type { AppDb } from './types';

/** Súbelo cuando cambien free-exercise-db.json o las fichas curadas para reaplicarlas. */
export const LIBRARY_VERSION = 2;

async function getMeta(db: AppDb, key: string): Promise<string | undefined> {
  const rows = await db.select().from(appMeta).where(eq(appMeta.key, key));
  return rows[0]?.value;
}

async function setMeta(db: AppDb, key: string, value: string) {
  await db
    .insert(appMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: appMeta.key, set: { value } });
}

/** Inserta o actualiza la biblioteca preservando favoritos y datos del usuario. */
export async function seedExerciseLibrary(db: AppDb) {
  const rows = buildExerciseLibrary();
  // Lotes pequeños: en la vista previa web cada operación síncrona tiene un tiempo límite.
  const CHUNK = 10;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(exercise)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: exercise.id,
        set: {
          nameEs: sql`excluded.name_es`,
          nameEn: sql`excluded.name_en`,
          curated: sql`excluded.curated`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          equipment: sql`excluded.equipment`,
          category: sql`excluded.category`,
          level: sql`excluded.level`,
          bodyRegion: sql`excluded.body_region`,
          kind: sql`excluded.kind`,
          defaultRestS: sql`excluded.default_rest_s`,
          instructions: sql`excluded.instructions`,
          commonErrors: sql`excluded.common_errors`,
          techniqueNote: sql`excluded.technique_note`,
          images: sql`excluded.images`,
          mediaAttribution: sql`excluded.media_attribution`,
        },
      });
  }
  return rows.length;
}

export async function seedDefaultRoutine(db: AppDb): Promise<number> {
  const [r] = await db
    .insert(routine)
    .values({
      name: DEFAULT_ROUTINE_NAME,
      notes: 'Rutina por defecto. Puedes editarla, duplicarla o crear las tuyas.',
      isActive: true,
    })
    .returning({ id: routine.id });
  for (const [i, day] of DEFAULT_ROUTINE.entries()) {
    const [d] = await db
      .insert(routineDay)
      .values({
        routineId: r.id,
        name: day.name,
        sortOrder: i,
        isOptional: day.isOptional ?? false,
        cardioNote: day.cardioNote ?? null,
      })
      .returning({ id: routineDay.id });
    await db.insert(routineExercise).values(
      day.exercises.map((e, j) => ({
        routineDayId: d.id,
        exerciseId: e.exerciseId,
        sortOrder: j,
        sets: e.sets,
        repMin: e.repMin,
        repMax: e.repMax,
        restS: e.restS ?? null,
        warmupSets: e.warmupSets ?? 0,
        notes: e.notes ?? null,
      })),
    );
  }
  return r.id;
}

/** Idempotente: se ejecuta en cada arranque tras las migraciones. */
export async function runSeed(db: AppDb) {
  await db.insert(profile).values({ id: 1 }).onConflictDoNothing();

  const libVersion = Number((await getMeta(db, 'library_version')) ?? 0);
  if (libVersion < LIBRARY_VERSION) {
    await seedExerciseLibrary(db);
    await setMeta(db, 'library_version', String(LIBRARY_VERSION));
  }

  if (!(await getMeta(db, 'default_routine_seeded'))) {
    await seedDefaultRoutine(db);
    await setMeta(db, 'default_routine_seeded', '1');
  }
}
