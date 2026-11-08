import { Share } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { DIET_FLAGS, dayPlanText } from '@/domain/mealPlanner';
import { MEALS, sumMacros } from '@/domain/nutrition';
import { dayEntriesQuery } from '@/repositories/diary';
import { energyStatus } from '@/repositories/energy';
import { markedFoodNames } from '@/repositories/mealPlanner';

/** Comparte como texto el plan del día (objetivo, lo que llevo y lo que me queda) para pedir ideas en un chat. */
export async function shareDayPlan(date: string) {
  const entries = await dayEntriesQuery(db, date);
  const energy = await energyStatus(db, date);
  const marked = await markedFoodNames(db);
  const flags = energy.profile.dietFlags ?? [];
  const text = dayPlanText({
    dateLabel: formatDateLong(date),
    target: energy.target && energy.macros ? { kcal: energy.target.targetKcal, protein: energy.macros.proteinG, carbs: energy.macros.carbsG, fat: energy.macros.fatG } : null,
    consumed: sumMacros(entries),
    spent: energy.today?.total ?? null,
    meals: MEALS.map((m) => ({ label: m.label, items: entries.filter((e) => e.meal === m.key).map((e) => ({ name: e.name, grams: e.grams, kcal: e.kcal })) })),
    flags: flags.map((f) => DIET_FLAGS.find((d) => d.key === f)?.label ?? f),
    ...marked,
  });
  await Share.share({ message: text });
}
