/**
 * Formato de la copia de seguridad (JSON) y exportación CSV. Funciones puras.
 *
 * {
 *   app: 'gym', format: 1, schemaVersion: <nº de migraciones>, exportedAt: ISO,
 *   tables: { profile: [...], workout: [...], ... }
 * }
 */
import { fmtNum } from './format';

export const BACKUP_APP = 'gym';
export const BACKUP_FORMAT = 1;

/** Tablas incluidas, en orden de inserción (primero las referenciadas). La caché no se copia. */
export const BACKUP_TABLES = [
  'appMeta',
  'profile',
  'exercise',
  'routine',
  'routineDay',
  'routineExercise',
  'workout',
  'workoutExercise',
  'workoutSet',
  'exerciseProgress',
  'personalRecord',
  'bodyWeight',
  'bodyMeasurement',
  'progressPhoto',
  'cardioSession',
  'reminder',
  'routineSuggestion',
  'dayOverride',
  'energyAdjustment',
  'food',
  'recipeItem',
  'diaryEntry',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupTables = Record<BackupTable, Record<string, unknown>[]>;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
}

export function buildBackup(tables: BackupTables, schemaVersion: number, now = new Date()): BackupFile {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion, exportedAt: now.toISOString(), tables };
}

export type ValidationResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export function validateBackup(json: unknown, currentSchemaVersion: number): ValidationResult {
  if (!json || typeof json !== 'object') return { ok: false, error: 'El archivo no es una copia de seguridad válida.' };
  const b = json as Partial<BackupFile>;
  if (b.app !== BACKUP_APP || typeof b.format !== 'number' || !b.tables || typeof b.tables !== 'object')
    return { ok: false, error: 'El archivo no es una copia de seguridad de esta app.' };
  if (b.format > BACKUP_FORMAT) return { ok: false, error: 'La copia es de una versión más nueva de la app. Actualiza la app primero.' };
  if (typeof b.schemaVersion !== 'number' || b.schemaVersion > currentSchemaVersion)
    return { ok: false, error: 'La copia es de una versión más nueva de la app. Actualiza la app primero.' };
  for (const t of BACKUP_TABLES) {
    const rows = (b.tables as Record<string, unknown>)[t];
    if (rows !== undefined && !Array.isArray(rows)) return { ok: false, error: `Datos dañados en «${t}».` };
  }
  if (!Array.isArray(b.tables.profile) || !b.tables.profile.length) return { ok: false, error: 'La copia no contiene el perfil.' };
  const tables = Object.fromEntries(BACKUP_TABLES.map((t) => [t, (b.tables as Record<string, unknown[]>)[t] ?? []])) as BackupTables;
  return { ok: true, backup: { ...(b as BackupFile), tables } };
}

export function summarizeBackup(b: BackupFile) {
  const n = (t: BackupTable) => b.tables[t].length;
  return {
    exportedAt: b.exportedAt,
    workouts: n('workout'),
    sets: n('workoutSet'),
    weights: n('bodyWeight'),
    measurements: n('bodyMeasurement'),
    photos: n('progressPhoto'),
    routines: n('routine'),
    customExercises: b.tables.exercise.filter((e) => e.isCustom).length,
  };
}

/** Nombre de archivo con fecha: gym-copia-2026-11-03.json */
export function backupFileName(kind: 'json' | 'zip' | 'csv', now = new Date()) {
  const d = now.toISOString().slice(0, 10);
  return kind === 'csv' ? `gym-datos-csv-${d}.zip` : `gym-copia-${d}.${kind}`;
}

// ───────────── CSV (formato español: «;» como separador y coma decimal, para Excel/Sheets) ─────────────

export type CsvValue = string | number | boolean | null | undefined;

function cell(v: CsvValue): string {
  if (v == null) return '';
  const s = typeof v === 'number' ? fmtNum(v, 3).replace(/\./g, '') : typeof v === 'boolean' ? (v ? 'sí' : 'no') : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con BOM UTF-8 (para que Excel muestre bien las tildes). */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export const MEASUREMENT_CSV_HEADERS = ['fecha', 'cintura_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm', 'cadera_cm', 'grasa_pct', 'nota'];

// ───────────── CSV de nutrición ─────────────

const MEAL_NAMES: Record<string, string> = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', snacks: 'Snacks' };

export function diaryCsv(
  rows: { date: string; meal: string; name: string; quantity: number | null; unit: string | null; grams: number | null; kcal: number; protein: number; carbs: number; fat: number; fiber: number }[],
) {
  return toCsv(
    ['fecha', 'comida', 'alimento', 'cantidad', 'unidad', 'gramos', 'kcal', 'proteina_g', 'hidratos_g', 'grasas_g', 'fibra_g'],
    rows.map((r) => [r.date, MEAL_NAMES[r.meal] ?? r.meal, r.name, r.quantity, r.unit, r.grams, r.kcal, r.protein, r.carbs, r.fat, r.fiber]),
  );
}

export function foodsCsv(
  rows: {
    name: string;
    brand: string | null;
    barcode: string | null;
    source: string;
    category: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    unitLabel: string | null;
    unitG: number | null;
    servingG: number | null;
    isFavorite: boolean;
    pref?: string | null;
    inPantry?: boolean;
    archived: boolean;
  }[],
) {
  return toCsv(
    ['nombre', 'marca', 'codigo_barras', 'origen', 'categoria', 'kcal_100g', 'proteina_100g', 'hidratos_100g', 'grasas_100g', 'fibra_100g', 'unidad', 'gramos_unidad', 'racion_g', 'favorito', 'preferencia', 'en_casa', 'borrado'],
    rows.map((f) => [f.name, f.brand, f.barcode, f.source, f.category, f.kcal, f.protein, f.carbs, f.fat, f.fiber, f.unitLabel, f.unitG, f.servingG, f.isFavorite, f.pref ?? null, f.inPantry ?? false, f.archived]),
  );
}

export function recipesCsv(rows: { recipe: string; servings: number | null; ingredient: string; grams: number }[]) {
  return toCsv(
    ['receta', 'raciones', 'ingrediente', 'gramos'],
    rows.map((r) => [r.recipe, r.servings, r.ingredient, r.grams]),
  );
}

export function cardioCsv(
  rows: { date: string; type: string; durationMin: number; speedKmh: number | null; inclinePct: number | null; intensity: string | null; distanceKm: number | null; steps: number | null; kcal: number | null; notes: string | null }[],
) {
  return toCsv(
    ['fecha', 'tipo', 'minutos', 'km_h', 'pendiente_pct', 'intensidad', 'km', 'pasos', 'kcal_estimadas', 'notas'],
    rows.map((c) => [c.date, c.type, c.durationMin, c.speedKmh, c.inclinePct, c.intensity, c.distanceKm, c.steps, c.kcal, c.notes]),
  );
}

/** Objetivos y preferencias de nutrición (clave;valor). */
export function goalsCsv(pairs: [string, CsvValue][]) {
  return toCsv(['ajuste', 'valor'], pairs);
}
