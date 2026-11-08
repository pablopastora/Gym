import { eq } from 'drizzle-orm';
import { router } from 'expo-router';

import { db } from '@/db/client';
import { exercise, type Profile } from '@/db/schema';
import { cardioTypeForExercise } from '@/domain/cardio';
import { addExerciseToWorkout, getActiveWorkout, startEmptyWorkout, startWorkoutFromDay } from '@/repositories/workouts';
import { ensureNotificationPermission } from '@/services/notifications';

import { showAlert } from './alert';

/** Empieza una sesión del día de rutina (o un entreno libre) y abre la pantalla de sesión. */
export async function startSession(profile: Profile, dayId: number | 'libre') {
  try {
    if (await getActiveWorkout(db)) {
      router.push('/sesion');
      return;
    }
    await ensureNotificationPermission();
    if (dayId === 'libre') await startEmptyWorkout(db);
    else await startWorkoutFromDay(db, dayId, profile);
    router.push('/sesion');
  } catch (e) {
    showAlert('No se pudo empezar', (e as Error).message);
  }
}

/**
 * Añade un ejercicio a un entreno. Si es de cardio (cinta, bici, elíptica…), en vez de
 * añadirlo como series de fuerza abre el registro de cardio vinculado a ese entreno,
 * para que cuente en las kcal y en los minutos de cardio.
 */
export async function addExerciseOrCardio(workout: { id: number; date: string }, exerciseId: string, profile: Profile) {
  const [ex] = await db.select({ category: exercise.category, name: exercise.nameEs, nameEn: exercise.nameEn }).from(exercise).where(eq(exercise.id, exerciseId));
  if (ex?.category === 'cardio') {
    router.push({ pathname: '/cardio/nuevo', params: { workoutId: workout.id, date: workout.date, type: cardioTypeForExercise(`${exerciseId} ${ex.nameEn ?? ex.name}`) } });
    return;
  }
  await addExerciseToWorkout(db, workout.id, exerciseId, profile);
}
