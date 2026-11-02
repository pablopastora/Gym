import { eq } from 'drizzle-orm';

import { profile, type Profile } from '@/db/schema';
import type { AppDb } from '@/db/types';

export type ProfilePatch = Partial<Omit<Profile, 'id' | 'updatedAt'>>;

export async function updateProfile(db: AppDb, patch: ProfilePatch) {
  await db
    .update(profile)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(profile.id, 1));
}
