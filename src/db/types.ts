import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as relations from './relations';
import * as tables from './schema';

export const fullSchema = { ...tables, ...relations };
export type FullSchema = typeof fullSchema;

/** Base de datos Drizzle independiente del driver (expo-sqlite en la app, node:sqlite en tests). */
export type AppDb = BaseSQLiteDatabase<'sync' | 'async', any, FullSchema>;
