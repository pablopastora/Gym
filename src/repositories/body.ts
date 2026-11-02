import { asc, desc, eq } from 'drizzle-orm';

import { bodyMeasurement, bodyWeight, progressPhoto } from '@/db/schema';
import type { AppDb } from '@/db/types';
import type { MeasurementKey, PhotoView } from '@/domain/body';

/** Guarda el peso del día (un registro por fecha: si existe, se sustituye). */
export async function upsertWeight(db: AppDb, date: string, weightKg: number) {
  await db
    .insert(bodyWeight)
    .values({ date, weightKg })
    .onConflictDoUpdate({ target: bodyWeight.date, set: { weightKg } });
}

export async function deleteWeight(db: AppDb, id: number) {
  await db.delete(bodyWeight).where(eq(bodyWeight.id, id));
}

export function weightsQuery(db: AppDb) {
  return db.select().from(bodyWeight).orderBy(asc(bodyWeight.date));
}

export type MeasurementInput = Partial<Record<MeasurementKey, number | null>>;

/** Guarda medidas del día combinándolas con las ya registradas esa fecha (los campos vacíos no borran). */
export async function upsertMeasurement(db: AppDb, date: string, input: MeasurementInput) {
  const values = Object.fromEntries(Object.entries(input).filter(([, v]) => v != null)) as MeasurementInput;
  if (!Object.keys(values).length) return;
  await db
    .insert(bodyMeasurement)
    .values({ date, ...values })
    .onConflictDoUpdate({ target: bodyMeasurement.date, set: values });
}

export async function deleteMeasurement(db: AppDb, id: number) {
  await db.delete(bodyMeasurement).where(eq(bodyMeasurement.id, id));
}

export function measurementsQuery(db: AppDb) {
  return db.select().from(bodyMeasurement).orderBy(asc(bodyMeasurement.date));
}

export async function addPhotoRecord(db: AppDb, date: string, view: PhotoView, fileName: string) {
  const [r] = await db.insert(progressPhoto).values({ date, view, fileName }).returning({ id: progressPhoto.id });
  return r.id;
}

/** Fotos de la misma fecha y vista (para sustituirlas al añadir una nueva). */
export async function photosAt(db: AppDb, date: string, view: PhotoView) {
  const rows = await db.select().from(progressPhoto).where(eq(progressPhoto.date, date));
  return rows.filter((r) => r.view === view);
}

export async function deletePhotoRecord(db: AppDb, id: number) {
  await db.delete(progressPhoto).where(eq(progressPhoto.id, id));
}

export function photosQuery(db: AppDb) {
  return db.select().from(progressPhoto).orderBy(desc(progressPhoto.date), asc(progressPhoto.id));
}
