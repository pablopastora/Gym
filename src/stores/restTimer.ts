import { create } from 'zustand';

import { adjustRest } from '@/domain/workout';
import { cancelScheduled, scheduleRestEnd } from '@/services/notifications';

interface Rest {
  endAt: number;
  totalS: number;
  label: string;
  notificationId: string | null;
}

interface RestTimerStore {
  rest: Rest | null;
  start: (seconds: number, label: string) => void;
  adjust: (deltaS: number) => void;
  skip: () => void;
  /** Llamado cuando el descanso llega a 0. */
  finish: () => void;
}

/** Reprograma la notificación y guarda el id solo si sigue siendo el mismo descanso. */
function reschedule(get: () => RestTimerStore, set: (p: Partial<RestTimerStore>) => void, endAt: number, label: string) {
  scheduleRestEnd(endAt, label).then((id) => {
    const cur = get().rest;
    if (cur && cur.endAt === endAt) set({ rest: { ...cur, notificationId: id } });
    else cancelScheduled(id);
  });
}

export const useRestTimer = create<RestTimerStore>((set, get) => ({
  rest: null,
  start: (seconds, label) => {
    cancelScheduled(get().rest?.notificationId);
    const endAt = Date.now() + seconds * 1000;
    set({ rest: { endAt, totalS: seconds, label, notificationId: null } });
    reschedule(get, set, endAt, label);
  },
  adjust: (deltaS) => {
    const cur = get().rest;
    if (!cur) return;
    cancelScheduled(cur.notificationId);
    const next = adjustRest(cur, deltaS, Date.now());
    if (!next) {
      set({ rest: null });
      return;
    }
    set({ rest: { ...cur, ...next, notificationId: null } });
    reschedule(get, set, next.endAt, cur.label);
  },
  skip: () => {
    cancelScheduled(get().rest?.notificationId);
    set({ rest: null });
  },
  finish: () => set({ rest: null }),
}));
