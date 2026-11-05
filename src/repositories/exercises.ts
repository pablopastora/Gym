import { count, eq } from 'drizzle-orm';

import { exercise, routineExercise, workoutExercise, type ExerciseKind, type ExerciseRole } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { classifyRegion } from '@/domain/exerciseClassify';

export interface CustomExerciseInput {
  nameEs: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  kind: ExerciseKind;
  defaultRestS: number | null;
  techniqueNote: string | null;
  instructions: string[];
  customPhotoFile: string | null;
}

export function validateCustomExercise(i: CustomExerciseInput): string | null {
  if (i.nameEs.trim().length < 2) return 'Pon un nombre al ejercicio.';
  if (!i.primaryMuscles.length && i.kind !== 'cardio') return 'Elige al menos un músculo principal.';
  return null;
}

function row(i: CustomExerciseInput) {
  return {
    nameEs: i.nameEs.trim(),
    primaryMuscles: i.primaryMuscles,
    secondaryMuscles: i.secondaryMuscles.filter((m) => !i.primaryMuscles.includes(m)),
    equipment: i.equipment,
    kind: i.kind,
    category: i.kind === 'cardio' ? 'cardio' : 'strength',
    bodyRegion: classifyRegion(i.primaryMuscles),
    defaultRestS: i.defaultRestS,
    techniqueNote: i.techniqueNote?.trim() || null,
    instructions: i.instructions.map((s) => s.trim()).filter(Boolean),
    customPhotoFile: i.customPhotoFile,
  };
}

export async function createCustomExercise(db: AppDb, input: CustomExerciseInput): Promise<string> {
  const err = validateCustomExercise(input);
  if (err) throw new Error(err);
  const id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(exercise).values({
    id,
    ...row(input),
    nameEn: null,
    source: 'usuario',
    curated: true,
    isCustom: true,
    commonErrors: [],
    images: [],
    mediaAttribution: input.customPhotoFile ? 'Foto propia' : null,
  });
  return id;
}

export async function updateCustomExercise(db: AppDb, id: string, input: CustomExerciseInput) {
  const err = validateCustomExercise(input);
  if (err) throw new Error(err);
  await db
    .update(exercise)
    .set({ ...row(input), mediaAttribution: input.customPhotoFile ? 'Foto propia' : null })
    .where(eq(exercise.id, id));
}

export async function exerciseUsage(db: AppDb, id: string) {
  const [{ r }] = await db.select({ r: count() }).from(routineExercise).where(eq(routineExercise.exerciseId, id));
  const [{ w }] = await db.select({ w: count() }).from(workoutExercise).where(eq(workoutExercise.exerciseId, id));
  return { routines: r, workouts: w };
}

/** Borra un ejercicio propio si no se usa en ninguna rutina ni entreno. Devuelve si se borró. */
export async function deleteCustomExercise(db: AppDb, id: string): Promise<boolean> {
  const [ex] = await db.select().from(exercise).where(eq(exercise.id, id));
  if (!ex?.isCustom) return false;
  const u = await exerciseUsage(db, id);
  if (u.routines || u.workouts) return false;
  await db.delete(exercise).where(eq(exercise.id, id));
  return true;
}

export async function setFavorite(db: AppDb, id: string, isFavorite: boolean) {
  await db.update(exercise).set({ isFavorite }).where(eq(exercise.id, id));
}

/** Rol del ejercicio para el plan automático (null = automático). */
export async function setExerciseRole(db: AppDb, id: string, role: ExerciseRole | null) {
  await db.update(exercise).set({ roleOverride: role }).where(eq(exercise.id, id));
}
