/**
 * Copias de seguridad en archivos: exportar (JSON, ZIP con fotos, CSV), importar
 * sustituyendo los datos (decisión 7a) con copia automática previa, y restaurar.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import { db } from '@/db/client';
import { bodyMeasurement, bodyWeight, cardioSession, workout } from '@/db/schema';
import {
  backupFileName,
  cardioCsv,
  MEASUREMENT_CSV_HEADERS,
  summarizeBackup,
  toCsv,
  validateBackup,
  type BackupFile,
} from '@/domain/backup';
import { exportAll, importAll, nutritionCsv, SCHEMA_VERSION, setsForCsv } from '@/repositories/backup';

import { syncReminders } from './reminders';

const PHOTO_DIRS = ['progress-photos', 'exercise-photos'] as const;
const AUTO_DIR = 'backups';
const AUTO_KEEP = 3;

function writeFile(file: File, data: string | Uint8Array) {
  if (file.exists) file.delete();
  file.create();
  file.write(data);
  return file;
}

async function share(file: File, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** Exporta y abre el menú de compartir (Drive, correo, guardar en archivos…). */
export async function exportBackup(withPhotos: boolean) {
  const backup = await exportAll(db);
  const json = JSON.stringify(backup);
  if (!withPhotos) {
    const f = writeFile(new File(Paths.cache, backupFileName('json')), json);
    await share(f, 'application/json', 'Guardar copia de seguridad');
    return;
  }
  const entries: Zippable = { 'backup.json': [strToU8(json), { level: 6 }] };
  for (const dir of PHOTO_DIRS) {
    const d = new Directory(Paths.document, dir);
    if (!d.exists) continue;
    for (const item of d.list()) {
      if (item instanceof File) entries[`${dir}/${item.name}`] = [await item.bytes(), { level: 0 }];
    }
  }
  const f = writeFile(new File(Paths.cache, backupFileName('zip')), zipSync(entries));
  await share(f, 'application/zip', 'Guardar copia de seguridad');
}

/** ZIP con CSV (separador «;», coma decimal) para abrir en Excel o Google Sheets. */
export async function exportCsv() {
  const sets = await setsForCsv(db);
  const weights = await db.select().from(bodyWeight);
  const measures = await db.select().from(bodyMeasurement);
  const cardio = await db.select().from(cardioSession);
  const workouts = await db.select().from(workout);
  const files: Zippable = {
    'series.csv': strToU8(
      toCsv(
        ['fecha', 'entreno', 'descarga', 'ejercicio', 'serie', 'tipo', 'kg', 'reps', 'rir', 'rpe', 'notas'],
        sets.map((s) => [s.date, s.workout, s.deload, s.exercise, s.setNo + 1, s.type, s.kg, s.reps, s.rir, s.rpe, s.notes]),
      ),
    ),
    'entrenos.csv': strToU8(
      toCsv(
        ['fecha', 'nombre', 'inicio', 'fin', 'minutos', 'descarga', 'notas'],
        workouts.map((w) => [
          w.date,
          w.name,
          new Date(w.startedAt).toLocaleTimeString('es-ES'),
          w.endedAt ? new Date(w.endedAt).toLocaleTimeString('es-ES') : null,
          w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60000) : null,
          w.isDeload,
          w.notes,
        ]),
      ),
    ),
    'peso.csv': strToU8(toCsv(['fecha', 'kg', 'nota'], weights.map((w) => [w.date, w.weightKg, w.note]))),
    'medidas.csv': strToU8(
      toCsv(
        MEASUREMENT_CSV_HEADERS,
        measures.map((m) => [m.date, m.waistCm, m.chestCm, m.armCm, m.thighCm, m.hipCm, m.bodyFatPct, m.note]),
      ),
    ),
    'cardio.csv': strToU8(cardioCsv(cardio)),
    ...Object.fromEntries(Object.entries(await nutritionCsv(db)).map(([name, csv]) => [name, strToU8(csv)])),
  };
  const f = writeFile(new File(Paths.cache, backupFileName('csv')), zipSync(files));
  await share(f, 'application/zip', 'Exportar a CSV');
}

export interface PendingImport {
  backup: BackupFile;
  photos: Record<string, Uint8Array>;
  summary: ReturnType<typeof summarizeBackup>;
}

/** Abre el selector de archivos y valida la copia (no modifica nada todavía). */
export async function pickBackup(): Promise<PendingImport | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip', '*/*'], copyToCacheDirectory: true });
  if (r.canceled) return null;
  const bytes = await new File(r.assets[0].uri).bytes();
  let jsonText: string;
  const photos: Record<string, Uint8Array> = {};
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes);
    if (!files['backup.json']) throw new Error('El ZIP no contiene backup.json.');
    jsonText = strFromU8(files['backup.json']);
    for (const [path, data] of Object.entries(files)) {
      if (PHOTO_DIRS.some((d) => path.startsWith(`${d}/`)) && !path.endsWith('/')) photos[path] = data;
    }
  } else {
    jsonText = strFromU8(bytes);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('El archivo no es una copia de seguridad válida.');
  }
  const v = validateBackup(parsed, SCHEMA_VERSION);
  if (!v.ok) throw new Error(v.error);
  return { backup: v.backup, photos, summary: summarizeBackup(v.backup) };
}

/** Guarda una copia automática de los datos actuales (para deshacer una importación). */
export async function autoBackup(): Promise<string> {
  const dir = new Directory(Paths.document, AUTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  const name = `auto-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFile(new File(dir, name), JSON.stringify(await exportAll(db)));
  const old = listAutoBackups().slice(AUTO_KEEP);
  for (const o of old) new File(dir, o.name).delete();
  return name;
}

export function listAutoBackups(): { name: string; date: Date }[] {
  const dir = new Directory(Paths.document, AUTO_DIR);
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((f): f is File => f instanceof File && f.name.startsWith('auto-'))
    .map((f) => ({ name: f.name, date: new Date(f.name.slice(5, -5).replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1:$2:$3.$4Z')) }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** Sustituye los datos por los de la copia (7a), tras guardar una copia automática. */
export async function applyImport(p: PendingImport) {
  await autoBackup();
  for (const [path, data] of Object.entries(p.photos)) {
    const [dirName, ...rest] = path.split('/');
    const dir = new Directory(Paths.document, dirName);
    if (!dir.exists) dir.create({ intermediates: true });
    writeFile(new File(dir, rest.join('/')), data);
  }
  await importAll(db, p.backup);
  await syncReminders();
}

export async function restoreAutoBackup(name: string) {
  const text = await new File(Paths.document, AUTO_DIR, name).text();
  const v = validateBackup(JSON.parse(text), SCHEMA_VERSION);
  if (!v.ok) throw new Error(v.error);
  await importAll(db, v.backup);
  await syncReminders();
}
