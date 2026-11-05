import { db } from '@/db/client';
import { addDays } from '@/domain/dates';
import { dayLabel, nextFreeDay, type WeekPlan } from '@/domain/weekPlan';
import type { PlanRoutineDay } from '@/repositories/plan';
import { clearWeekOverrides, moveSession } from '@/repositories/plan';

import { ActionSheet, type SheetAction } from './ActionSheet';

/** Mover una sesión a otro día con un toque (o deshacer los cambios de la semana). */
export function MoveDaySheet({
  plan,
  from,
  hasOverrides,
  onClose,
}: {
  plan: WeekPlan<PlanRoutineDay> | null;
  from: string | null;
  hasOverrides: boolean;
  onClose: () => void;
}) {
  if (!plan) return null;
  const actions: SheetAction[] = [];
  if (from) {
    const tomorrow = addDays(from, 1);
    const tomorrowEntry = plan.days.find((d) => d.date === tomorrow);
    if (!tomorrowEntry?.workouts.length) {
      actions.push({
        label: `A ${dayLabel(tomorrow, plan.today).toLowerCase()}${tomorrowEntry?.status === 'programado' ? ' (desplaza el resto)' : ''}`,
        icon: 'calendar-arrow-right',
        onPress: () => moveSession(db, from, tomorrow),
      });
    }
    const free = nextFreeDay(plan, from);
    if (free && free !== tomorrow) {
      actions.push({ label: `Al ${dayLabel(free, plan.today).toLowerCase()} (siguiente día libre)`, icon: 'calendar-check', onPress: () => moveSession(db, from, free) });
    }
  }
  if (hasOverrides) actions.push({ label: 'Deshacer cambios de esta semana', icon: 'undo', onPress: () => clearWeekOverrides(db, plan.today) });
  return <ActionSheet visible={from != null || false} title="Mover sesión" actions={actions} onClose={onClose} />;
}
