import { asc, eq } from 'drizzle-orm';

import { reminder } from '@/db/schema';
import type { AppDb } from '@/db/types';

export function remindersQuery(db: AppDb) {
  return db.select().from(reminder).orderBy(asc(reminder.weekday));
}

/** Un recordatorio por día de la semana (1 = lunes … 7 = domingo). */
export async function setReminder(db: AppDb, weekday: number, patch: { hour?: number; minute?: number; enabled?: boolean }) {
  const [existing] = await db.select().from(reminder).where(eq(reminder.weekday, weekday));
  if (existing) await db.update(reminder).set(patch).where(eq(reminder.id, existing.id));
  else await db.insert(reminder).values({ weekday, hour: patch.hour ?? 18, minute: patch.minute ?? 0, enabled: patch.enabled ?? true });
}

export async function setReminderNotificationId(db: AppDb, id: number, notificationId: string | null) {
  await db.update(reminder).set({ notificationId }).where(eq(reminder.id, id));
}
