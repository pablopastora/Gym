import { db } from '@/db/client';
import { toISODate } from '@/domain/dates';
import { getDeloadStatus } from '@/repositories/progress';

import { useAsyncQuery, useProfile } from './useDb';

export function useDeload() {
  const profile = useProfile();
  const today = toISODate();
  const { data } = useAsyncQuery(`deload-${profile?.deloadUntil}-${profile?.deloadSnoozeUntil}-${profile?.lastDeloadDate}`, async () =>
    profile ? getDeloadStatus(db, profile, today) : null,
  );
  return { status: data ?? null, profile, today };
}
