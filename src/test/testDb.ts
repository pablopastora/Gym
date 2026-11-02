/**
 * Base de datos en memoria para tests: node:sqlite + driver sqlite-proxy de Drizzle,
 * aplicando las mismas migraciones SQL que usa la app.
 */
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import { journal, migrations } from '@/db/migrations';
import { fullSchema, type AppDb } from '@/db/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

export function createTestDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  for (const entry of journal.entries) {
    const key = `m${String(entry.idx).padStart(4, '0')}`;
    for (const stmt of migrations[key].split('--> statement-breakpoint')) {
      if (stmt.trim()) raw.exec(stmt);
    }
  }
  const db = drizzle(
    async (query, params, method) => {
      const stmt = raw.prepare(query);
      if (method === 'run') {
        stmt.run(...(params as never[]));
        return { rows: [] };
      }
      stmt.setReturnArrays(true);
      if (method === 'get') {
        const row = stmt.get(...(params as never[]));
        return { rows: (row ?? undefined) as never };
      }
      return { rows: stmt.all(...(params as never[])) as never };
    },
    { schema: fullSchema },
  ) as unknown as AppDb;
  return { db, raw };
}
