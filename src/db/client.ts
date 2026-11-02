import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { fullSchema, type FullSchema } from './types';

export const DB_NAME = 'gym.db';

let expoDbInstance: SQLiteDatabase | null = null;
let dbInstance: ExpoSQLiteDatabase<FullSchema> | null = null;

/**
 * Abre y configura la base de datos. Se hace de forma asíncrona para que en la
 * vista previa web el worker de SQLite esté listo antes de cualquier consulta.
 * Debe completarse antes de usar `db` (lo garantiza el layout raíz).
 */
export async function initDb() {
  if (dbInstance) return;
  expoDbInstance = await openDatabaseAsync(DB_NAME, { enableChangeListener: true });
  await expoDbInstance.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  dbInstance = drizzle(expoDbInstance, { schema: fullSchema });
}

function notReady(): never {
  throw new Error('Base de datos no inicializada: llama a initDb() antes.');
}

/** Instancia de Drizzle. Proxy para poder importarla antes de que esté abierta. */
export const db = new Proxy({} as ExpoSQLiteDatabase<FullSchema>, {
  get(_t, prop) {
    const target = dbInstance ?? notReady();
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export function getExpoDb(): SQLiteDatabase {
  return expoDbInstance ?? notReady();
}
