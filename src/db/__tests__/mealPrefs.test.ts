import { eq } from 'drizzle-orm';

import { food, profile } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { suggestMeals } from '@/domain/mealPlanner';
import { exportAll } from '@/repositories/backup';
import { clearPantry, markedFoodNames, plannerFoods, setDietFlags, setFoodPantry, setFoodPref } from '@/repositories/mealPlanner';
import { createTestDb } from '@/test/testDb';

describe('preferencias de comida', () => {
  it('se guardan, se respetan en las propuestas y van en la copia', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    const id = async (k: string) => (await db.select().from(food).where(eq(food.baseKey, k)))[0].id;
    await setFoodPref(db, await id('pollo_pechuga_plancha'), 'alergia');
    await setFoodPref(db, await id('salmon_cocinado'), 'gusta');
    await setFoodPantry(db, await id('salmon_cocinado'), true);
    await setFoodPantry(db, await id('arroz_cocido'), true);
    await setDietFlags(db, ['sin_lactosa', 'inventado']);
    const [p] = await db.select().from(profile);
    expect(p.dietFlags).toEqual(['sin_lactosa']);

    const opts = suggestMeals({ foods: await plannerFoods(db), flags: p.dietFlags, meal: 'comida', target: { kcal: 700, protein: 50, fat: 20 } });
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(o.items.map((i) => i.food.name)).not.toContain('Pechuga de pollo a la plancha');
      expect(o.items.find((i) => i.role === 'proteina')!.food.name).toBe('Salmón (cocinado)');
    }

    const marked = await markedFoodNames(db);
    expect(marked.excluded).toEqual(['Pechuga de pollo a la plancha']);
    expect(marked.pantry.sort()).toEqual(['Arroz blanco cocido', 'Salmón (cocinado)']);

    const backup = await exportAll(db);
    expect(backup.tables.food.filter((f) => f.pref || f.inPantry)).toHaveLength(3);
    expect(backup.tables.profile[0].dietFlags).toEqual(['sin_lactosa']);

    await clearPantry(db);
    expect((await markedFoodNames(db)).pantry).toEqual([]);
  });
});
