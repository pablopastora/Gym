import { router } from 'expo-router';

import { db } from '@/db/client';
import type { Profile } from '@/db/schema';
import { getActiveWorkout, startEmptyWorkout, startWorkoutFromDay } from '@/repositories/workouts';
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
