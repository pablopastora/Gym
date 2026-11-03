/**
 * Notificación de fin de descanso.
 * Se programa una notificación local para la hora exacta de fin; así suena y vibra
 * aunque la app esté en segundo plano o el móvil bloqueado. Con la app en primer
 * plano se suprime y el aviso lo da RestTimerWatcher (vibración + háptica).
 */
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { Platform } from 'react-native';

export const REST_CHANNEL = 'descanso';
const REST_KIND = 'rest';

let configured = false;

export async function setupNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const isRest = n.request.content.data?.kind === REST_KIND;
      return {
        shouldShowBanner: !isRest,
        shouldShowList: !isRest,
        shouldPlaySound: !isRest,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios de entreno',
      importance: AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
      name: 'Fin del descanso',
      description: 'Aviso con vibración y sonido cuando termina el descanso entre series',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      enableVibrate: true,
      sound: 'default',
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/** Pide permiso de notificaciones (Android 13+). Devuelve si está concedido. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function scheduleRestEnd(endAt: number, nextLabel: string): Promise<string | null> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Descanso terminado!',
        body: nextLabel ? `A por la siguiente serie: ${nextLabel}` : 'A por la siguiente serie',
        data: { kind: REST_KIND },
        sound: 'default',
        priority: AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500, 250, 500],
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: endAt, channelId: REST_CHANNEL },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduled(id: string | null | undefined) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ya disparada o inexistente
  }
}
