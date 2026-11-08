import { eq } from 'drizzle-orm';

import { appMeta, bodyWeight, diaryEntry, energyAdjustment, food, profile } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { validateBackup } from '@/domain/backup';
import { exportAll, importAll, nutritionCsv, SCHEMA_VERSION } from '@/repositories/backup';
import { addFoodEntry, addQuickEntry, copyEntries, dayEntriesQuery, intakeByDay, updateFoodEntry, weeklyIntakeVsExpenditure } from '@/repositories/diary';
import { archiveFood, cacheOffFood, createCustomFood, foodByBarcode, getFood, recipeItems, saveRecipe, searchFoodsLocal, seedBaseFoods, updateFood } from '@/repositories/foods';
import { createTestDb } from '@/test/testDb';

async function setup() {
  const { db } = createTestDb();
  await runSeed(db);
  const byKey = async (k: string) => (await db.select().from(food).where(eq(food.baseKey, k)))[0];
  return { db, byKey };
}

describe('alimentos', () => {
  it('la lista local se carga una vez, sin duplicar, y respeta lo editado', async () => {
    const { db, byKey } = await setup();
    const n = (await db.select().from(food)).length;
    expect(n).toBeGreaterThanOrEqual(200);
    const pollo = await byKey('pollo_pechuga_plancha');
    expect(pollo).toMatchObject({ name: 'Pechuga de pollo a la plancha', kcal: 165, protein: 31 });
    await updateFood(db, pollo.id, { name: 'Mi pollo', kcal: 150, protein: 30, carbs: 0, fat: 3 });
    await seedBaseFoods(db, true);
    expect((await db.select().from(food)).length).toBe(n);
    expect((await getFood(db, pollo.id))!.name).toBe('Mi pollo');
  });

  it('búsqueda local sin tildes', async () => {
    const { db } = await setup();
    const all = await db.select().from(food);
    expect(searchFoodsLocal(all, 'platano')[0].name).toBe('Plátano');
    expect(searchFoodsLocal(all, 'pechuga pollo').length).toBeGreaterThanOrEqual(2);
  });

  it('Open Food Facts: se cachea por código de barras sin duplicar', async () => {
    const { db } = await setup();
    const off = { barcode: '8410000000000', name: 'Yogur', brand: 'Marca', kcal: 61, protein: 3.6, carbs: 4.7, fat: 3.1, fiber: 0, salt: 0.1, servingG: 125 };
    const id = await cacheOffFood(db, off);
    expect(await cacheOffFood(db, { ...off, kcal: 62 })).toBe(id);
    expect((await foodByBarcode(db, '8410000000000'))!.kcal).toBe(62);
  });

  it('recetas: valores por 100 g y ración, editables', async () => {
    const { db, byKey } = await setup();
    const pollo = await byKey('pollo_pechuga_plancha');
    const arroz = await byKey('arroz_crudo');
    const id = await saveRecipe(db, { name: 'Pollo con arroz', servings: 2, items: [{ foodId: pollo.id, grams: 300 }, { foodId: arroz.id, grams: 160 }] });
    const r = (await getFood(db, id))!;
    expect(r).toMatchObject({ source: 'receta', servings: 2, servingG: 230, unitG: 230 });
    expect(r.kcal).toBe(Math.round(((495 + 584) / 460) * 100));
    await saveRecipe(db, { name: 'Pollo con arroz', servings: 3, items: [{ foodId: pollo.id, grams: 300 }] }, id);
    expect(await recipeItems(db, id)).toHaveLength(1);
    expect((await getFood(db, id))!.servingG).toBe(100);
  });
});

describe('diario de comidas', () => {
  it('añadir por gramos, unidades o raciones; editar; kcal rápidas; copiar ayer y una comida', async () => {
    const { db, byKey } = await setup();
    const pollo = await byKey('pollo_pechuga_plancha');
    const huevo = await byKey('huevo');
    const e1 = await addFoodEntry(db, { date: '2026-11-09', meal: 'comida', food: pollo, quantity: 150, unit: 'g' });
    await addFoodEntry(db, { date: '2026-11-09', meal: 'desayuno', food: huevo, quantity: 2, unit: 'unidad' });
    await addQuickEntry(db, { date: '2026-11-09', meal: 'snacks', kcal: 200, protein: 10 });
    let day = await dayEntriesQuery(db, '2026-11-09');
    expect(day.find((e) => e.id === e1)).toMatchObject({ grams: 150, kcal: 248, protein: 46.5 });
    expect(day.find((e) => e.meal === 'desayuno')).toMatchObject({ grams: 110, unit: 'unidad', quantity: 2 });
    await updateFoodEntry(db, e1, { meal: 'cena', food: pollo, quantity: 1, unit: 'racion' });
    day = await dayEntriesQuery(db, '2026-11-09');
    expect(day.find((e) => e.id === e1)).toMatchObject({ meal: 'cena', grams: 130 });
    // Último uso para «Recientes».
    expect((await getFood(db, pollo.id))!.lastUsedAt).not.toBeNull();

    expect(await copyEntries(db, { fromDate: '2026-11-09', toDate: '2026-11-10' })).toBe(3);
    expect(await copyEntries(db, { fromDate: '2026-11-09', fromMeal: 'desayuno', toDate: '2026-11-11', toMeal: 'merienda' })).toBe(1);
    expect((await dayEntriesQuery(db, '2026-11-11'))[0].meal).toBe('merienda');

    const intake = await intakeByDay(db, '2026-11-09', '2026-11-10');
    expect(intake.get('2026-11-09')!.kcal).toBe(intake.get('2026-11-10')!.kcal);
  });

  it('borrar un alimento no cambia lo ya registrado', async () => {
    const { db } = await setup();
    const id = await createCustomFood(db, { name: 'Galleta', kcal: 450, protein: 7, carbs: 70, fat: 15, unitLabel: '1 galleta', unitG: 10 });
    await addFoodEntry(db, { date: '2026-11-09', meal: 'merienda', food: (await getFood(db, id))!, quantity: 3, unit: 'unidad' });
    await archiveFood(db, id);
    const [e] = await dayEntriesQuery(db, '2026-11-09');
    expect(e).toMatchObject({ kcal: 135, name: 'Galleta' });
  });

  it('ingesta frente a gasto por semana', async () => {
    const { db, byKey } = await setup();
    await db.update(profile).set({ age: 30, sex: 'hombre' });
    await db.insert(bodyWeight).values({ date: '2026-11-01', weightKg: 95 });
    const arroz = await byKey('arroz_cocido');
    await addFoodEntry(db, { date: '2026-11-09', meal: 'comida', food: arroz, quantity: 1000, unit: 'g' });
    await addFoodEntry(db, { date: '2026-11-10', meal: 'comida', food: arroz, quantity: 2000, unit: 'g' });
    const weeks = await weeklyIntakeVsExpenditure(db, '2026-11-11', 2);
    expect(weeks.at(-1)).toMatchObject({ loggedDays: 2, avgIntake: 1950 });
    expect(weeks.at(-1)!.avgExpenditure).toBeGreaterThan(2400);
  });
});

describe('copia de seguridad de nutrición', () => {
  it('ida y vuelta (JSON) con alimentos, recetas, diario, objetivos y ajustes', async () => {
    const { db, byKey } = await setup();
    await db.update(profile).set({ age: 30, sex: 'hombre', proteinGPerKg: 2.2, activityLevel: 'activo', kcalTargetManual: 2300 });
    const pollo = await byKey('pollo_pechuga_plancha');
    const own = await createCustomFood(db, { name: 'Tortilla de la abuela', kcal: 180, protein: 9, carbs: 12, fat: 11 });
    const rec = await saveRecipe(db, { name: 'Bowl', servings: 1, items: [{ foodId: pollo.id, grams: 150 }, { foodId: own, grams: 100 }] });
    await addFoodEntry(db, { date: '2026-11-09', meal: 'comida', food: (await getFood(db, rec))!, quantity: 1, unit: 'racion' });
    await addQuickEntry(db, { date: '2026-11-09', meal: 'snacks', kcal: 150 });
    await db.insert(energyAdjustment).values({ createdDate: '2026-11-09', fromDate: '2026-10-19', toDate: '2026-11-08', loggedDays: 18, avgIntake: 2100, avgEstimated: 2500, weightChangeKg: -0.2, observedTdee: 2300, deltaKcal: -200 });

    const backup = JSON.parse(JSON.stringify(await exportAll(db)));
    expect(backup.tables.diaryEntry).toHaveLength(2);
    expect(backup.tables.recipeItem).toHaveLength(2);
    expect(backup.tables.energyAdjustment).toHaveLength(1);
    const v = validateBackup(backup, SCHEMA_VERSION);
    expect(v.ok).toBe(true);

    const { db: other } = createTestDb();
    await runSeed(other);
    await addQuickEntry(other, { date: '2026-01-01', meal: 'cena', kcal: 999 });
    if (v.ok) await importAll(other, v.backup);
    const again = JSON.parse(JSON.stringify(await exportAll(other)));
    for (const t of ['food', 'recipeItem', 'diaryEntry', 'energyAdjustment', 'profile', 'appMeta']) expect([t, again.tables[t]]).toEqual([t, backup.tables[t]]);
  });

  it('una copia antigua (sin tablas de nutrición) se importa y carga la lista básica', async () => {
    const { db } = await setup();
    const backup = JSON.parse(JSON.stringify(await exportAll(db)));
    for (const t of ['food', 'recipeItem', 'diaryEntry', 'energyAdjustment']) delete backup.tables[t];
    backup.tables.appMeta = backup.tables.appMeta.filter((m: { key: string }) => m.key !== 'base_foods_version');
    const v = validateBackup(backup, SCHEMA_VERSION);
    expect(v.ok).toBe(true);
    const { db: other } = createTestDb();
    await runSeed(other);
    if (v.ok) await importAll(other, v.backup);
    expect((await other.select().from(food)).length).toBeGreaterThanOrEqual(200);
    expect(await other.select().from(appMeta).where(eq(appMeta.key, 'base_foods_version'))).toHaveLength(1);
  });

  it('CSV de comidas, alimentos, recetas, objetivos y ajustes', async () => {
    const { db, byKey } = await setup();
    const pollo = await byKey('pollo_pechuga_plancha');
    await addFoodEntry(db, { date: '2026-11-09', meal: 'comida', food: pollo, quantity: 150, unit: 'g' });
    await saveRecipe(db, { name: 'Bowl', servings: 2, items: [{ foodId: pollo.id, grams: 150 }] });
    const files = await nutritionCsv(db);
    expect(Object.keys(files).sort()).toEqual(['ajustes_gasto.csv', 'alimentos.csv', 'comidas.csv', 'objetivos.csv', 'recetas.csv']);
    expect(files['comidas.csv']).toContain('2026-11-09;Comida;Pechuga de pollo a la plancha;150;g;150;248;46,5');
    expect(files['recetas.csv']).toContain('Bowl;2;Pechuga de pollo a la plancha;150');
    // La lista básica sin usar no se exporta; el pollo usado sí.
    expect(files['alimentos.csv']).toContain('Pechuga de pollo a la plancha');
    expect(files['alimentos.csv']).not.toContain('Sandía');
    expect(files['objetivos.csv']).toContain('proteina_g_kg;2');
    expect((await db.select().from(diaryEntry)).length).toBe(1);
  });
});
