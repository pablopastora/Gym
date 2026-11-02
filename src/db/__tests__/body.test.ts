import { bodyMeasurement, bodyWeight } from '@/db/schema';
import { runSeed } from '@/db/seed';
import { addPhotoRecord, photosAt, upsertMeasurement, upsertWeight } from '@/repositories/body';
import { createTestDb } from '@/test/testDb';

describe('seguimiento corporal', () => {
  it('un peso por día: guardar dos veces sustituye', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await upsertWeight(db, '2026-11-02', 95);
    await upsertWeight(db, '2026-11-02', 94.8);
    await upsertWeight(db, '2026-11-03', 94.6);
    const rows = await db.select().from(bodyWeight);
    expect(rows.map((r) => [r.date, r.weightKg])).toEqual([
      ['2026-11-02', 94.8],
      ['2026-11-03', 94.6],
    ]);
  });

  it('medidas del mismo día se combinan y los campos vacíos no borran', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await upsertMeasurement(db, '2026-11-02', { waistCm: 104, chestCm: 110 });
    await upsertMeasurement(db, '2026-11-02', { waistCm: 103.5, armCm: null, bodyFatPct: 25 });
    await upsertMeasurement(db, '2026-11-02', {});
    const [m] = await db.select().from(bodyMeasurement);
    expect(m).toMatchObject({ waistCm: 103.5, chestCm: 110, armCm: null, bodyFatPct: 25 });
  });

  it('fotos por fecha y vista', async () => {
    const { db } = createTestDb();
    await runSeed(db);
    await addPhotoRecord(db, '2026-11-02', 'frontal', 'a.jpg');
    await addPhotoRecord(db, '2026-11-02', 'lateral', 'b.jpg');
    expect((await photosAt(db, '2026-11-02', 'frontal')).map((p) => p.fileName)).toEqual(['a.jpg']);
  });
});
