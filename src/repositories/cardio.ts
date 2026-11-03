import { desc, eq } from 'drizzle-orm';

import { cardioSession } from '@/db/schema';
import type { AppDb } from '@/db/types';

import { computeCardioKcal } from './kcal';

export const CARDIO_TYPES = [
  'Cinta inclinada',
  'Cinta',
  'Caminar',
  'Correr',
  'Bici estática',
  'Elíptica',
  'Remo',
  'Escaleras',
  'Otro',
] as const;

export interface CardioInput {
  date: string;
  type: string;
  durationMin: number;
  steps?: number | null;
  distanceKm?: number | null;
  notes?: string | null;
  workoutId?: number | null;
}

export async function addCardio(db: AppDb, input: CardioInput) {
  const [r] = await db
    .insert(cardioSession)
    .values({
      date: input.date,
      type: input.type,
      durationMin: input.durationMin,
      steps: input.steps ?? null,
      distanceKm: input.distanceKm ?? null,
      notes: input.notes?.trim() || null,
      workoutId: input.workoutId ?? null,
    })
    .returning({ id: cardioSession.id });
  await computeCardioKcal(db, r.id);
  return r.id;
}

export async function deleteCardio(db: AppDb, id: number) {
  await db.delete(cardioSession).where(eq(cardioSession.id, id));
}

export function recentCardioQuery(db: AppDb, limit = 20) {
  return db.select().from(cardioSession).orderBy(desc(cardioSession.date), desc(cardioSession.id)).limit(limit);
}
