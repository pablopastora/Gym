/** Recordatorios semanales de entrenamiento (notificaciones locales repetidas). */
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { toExpoWeekday } from '@/domain/calendar';
import { remindersQuery, setReminderNotificationId } from '@/repositories/reminders';

/** Canal creado en setupNotifications(). */
export const REMINDER_CHANNEL = 'recordatorios';
const KIND = 'reminder';

/** Cancela y vuelve a programar todos los recordatorios según la base de datos. */
export async function syncReminders() {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.kind === KIND) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    const rows = await remindersQuery(db);
    for (const r of rows) {
      let id: string | null = null;
      if (r.enabled) {
        id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Hora de entrenar', body: 'Abre la app para ver tu sesión de hoy.', data: { kind: KIND } },
          trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: toExpoWeekday(r.weekday), hour: r.hour, minute: r.minute, channelId: REMINDER_CHANNEL },
        });
      }
      await setReminderNotificationId(db, r.id, id);
    }
  } catch {
    // sin permiso de notificaciones: se reintentará al cambiar los recordatorios
  }
}
