import { eq } from 'drizzle-orm';

import { bodyWeight, energyAdjustment, profile } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { addDays } from '@/domain/dates';
import { addCardio } from '@/repositories/cardio';
import { decideAdjustment, energyStatus, maybeProposeAdjustment } from '@/repositories/energy';
import { createTestDb } from '@/test/testDb';

async function setup(over: Partial<typeof profile.$inferInsert> = {}) {
  const { db } = createTestDb();
  await runSeed(db);
  await db.update(profile).set({ heightCm: 185, ...over });
  return db;
}

describe('estado energético', () => {
  it('sin edad ni sexo pide los datos y no calcula', async () => {
    const db = await setup();
    const s = await energyStatus(db, '2026-11-10');
    expect(s.missing).toEqual(['edad', 'sexo']);
    expect(s.bmr).toBeNull();
    expect(s.target).toBeNull();
  });

  it('con perfil completo: basal con el último peso, gasto con cardio neto y objetivo', async () => {
    const db = await setup({ age: 30, sex: 'hombre', activityLevel: 'ligero', targetRateKgWeek: 0.5 });
    await db.insert(bodyWeight).values([
      { date: '2026-11-01', weightKg: 97 },
      { date: '2026-11-09', weightKg: 95 },
    ]);
    await addCardio(db, { date: '2026-11-10', type: 'Cinta', durationMin: 30, speedKmh: 5.5, inclinePct: 5 });
    const s = await energyStatus(db, '2026-11-10');
    expect(s.bmr).toBeCloseTo(1961.25);
    expect(s.today!.exerciseGross).toBe(298);
    expect(s.today!.exerciseNet).toBeGreaterThan(200);
    expect(s.today!.total).toBeCloseTo(1961.25 * 1.3 + s.today!.exerciseNet);
    // Día medio: sin actividad los 14 días anteriores → 2549,6; −550
    expect(s.target!.targetKcal).toBe(2000);
    expect(s.macros!.proteinG).toBe(190);
  });

  it('el objetivo manual por debajo del suelo se marca', async () => {
    const db = await setup({ age: 30, sex: 'hombre', kcalTargetManual: 1400 });
    await db.insert(bodyWeight).values({ date: '2026-11-09', weightKg: 95 });
    const s = await energyStatus(db, '2026-11-10');
    expect(s.target!.manualBelowFloor).toBe(true);
    expect(s.target!.floorKcal).toBe(1961);
  });
});

describe('ajuste sugerido del gasto', () => {
  const today = '2026-11-30';
  async function withHistory() {
    const db = await setup({ age: 30, sex: 'hombre', activityLevel: 'ligero' });
    const intake = new Map<string, number>();
    for (let i = 30; i >= 1; i--) {
      const d = addDays(today, -i);
      // Baja solo 0,1 kg/sem comiendo 2000 (el gasto estimado es ~2540 → debería bajar ~0,5).
      await db.insert(bodyWeight).values({ date: d, weightKg: 95 - (0.1 / 7) * (30 - i) });
      intake.set(d, 2000);
    }
    return { db, intake };
  }

  it('se propone, no se aplica solo, y al aceptar recalibra', async () => {
    const { db, intake } = await withHistory();
    const a = await maybeProposeAdjustment(db, today, intake);
    expect(a).not.toBeNull();
    expect(a!.deltaKcal).toBeLessThan(0);
    expect((await db.select().from(profile))[0].tdeeAdjustKcal).toBe(0);
    // No se duplica mientras hay uno pendiente.
    expect(await maybeProposeAdjustment(db, today, intake)).toBeNull();
    await decideAdjustment(db, a!.id, true);
    expect((await db.select().from(profile))[0].tdeeAdjustKcal).toBe(a!.deltaKcal);
    const [row] = await db.select().from(energyAdjustment).where(eq(energyAdjustment.id, a!.id));
    expect(row.status).toBe('aceptado');
  });

  it('rechazar no cambia nada y espera 14 días para volver a proponer', async () => {
    const { db, intake } = await withHistory();
    const a = await maybeProposeAdjustment(db, today, intake);
    await decideAdjustment(db, a!.id, false);
    expect((await db.select().from(profile))[0].tdeeAdjustKcal).toBe(0);
    expect(await maybeProposeAdjustment(db, addDays(today, 7), intake)).toBeNull();
  });

  it('sin datos de ingesta no propone nada', async () => {
    const { db } = await withHistory();
    expect(await maybeProposeAdjustment(db, today, new Map())).toBeNull();
  });
});
