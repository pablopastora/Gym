import { backupFileName, buildBackup, BACKUP_TABLES, toCsv, validateBackup, type BackupTables } from '../backup';

const empty = Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as BackupTables;
const tables = { ...empty, profile: [{ id: 1, heightCm: 185 }] };

describe('copia de seguridad', () => {
  it('construye y valida', () => {
    const b = buildBackup(tables, 4, new Date('2026-11-03T10:00:00Z'));
    const r = validateBackup(JSON.parse(JSON.stringify(b)), 4);
    expect(r.ok).toBe(true);
  });
  it('acepta copias de versiones anteriores del esquema y rellena tablas que falten', () => {
    const b = buildBackup(tables, 2) as unknown as { tables: Record<string, unknown> };
    delete b.tables.reminder;
    const r = validateBackup(b, 4);
    expect(r.ok && r.backup.tables.reminder).toEqual([]);
  });
  it('rechaza archivos ajenos, dañados o de versiones más nuevas', () => {
    expect(validateBackup(null, 4).ok).toBe(false);
    expect(validateBackup({ foo: 1 }, 4).ok).toBe(false);
    expect(validateBackup(buildBackup(tables, 5), 4)).toEqual({ ok: false, error: expect.stringMatching(/más nueva/) });
    expect(validateBackup({ ...buildBackup(tables, 4), tables: { ...tables, workout: 'x' } }, 4).ok).toBe(false);
    expect(validateBackup(buildBackup(empty, 4), 4)).toEqual({ ok: false, error: expect.stringMatching(/perfil/) });
  });
  it('nombres de archivo con fecha', () => {
    const d = new Date('2026-11-03T10:00:00Z');
    expect(backupFileName('json', d)).toBe('gym-copia-2026-11-03.json');
    expect(backupFileName('csv', d)).toBe('gym-datos-csv-2026-11-03.zip');
  });
});

describe('CSV', () => {
  it('separador «;», coma decimal, comillas y BOM', () => {
    const csv = toCsv(['fecha', 'kg', 'nota', 'ok'], [['2026-11-03', 82.5, 'dijo "hola"; bien', true], ['2026-11-04', 1234.5, null, false]]);
    expect(csv).toBe('﻿fecha;kg;nota;ok\r\n2026-11-03;82,5;"dijo ""hola""; bien";sí\r\n2026-11-04;1234,5;;no\r\n');
  });
});
