// Convierte las migraciones SQL generadas por drizzle-kit (carpeta ./drizzle)
// en un módulo TypeScript (src/db/migrations.ts) con el SQL embebido.
// Así no hace falta ningún plugin de Babel para importar archivos .sql,
// y el mismo módulo sirve para la app y para los tests en Node.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const journal = JSON.parse(readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8'));

const migrations = {};
for (const entry of journal.entries) {
  const key = `m${String(entry.idx).padStart(4, '0')}`;
  migrations[key] = readFileSync(join(root, 'drizzle', `${entry.tag}.sql`), 'utf8');
}

const out = `// ARCHIVO GENERADO por scripts/build-migrations.mjs — no editar a mano.
// Regenerar con: npm run db:generate

export const journal = ${JSON.stringify(
  { entries: journal.entries.map(({ idx, when, tag, breakpoints }) => ({ idx, when, tag, breakpoints })) },
  null,
  2,
)};

export const migrations: Record<string, string> = ${JSON.stringify(migrations, null, 2)};

const bundle = { journal, migrations };
export default bundle;
`;

writeFileSync(join(root, 'src/db/migrations.ts'), out);
// drizzle-kit (driver expo) genera también drizzle/migrations.js, que importa .sql;
// no lo usamos, así que se elimina para evitar confusiones.
rmSync(join(root, 'drizzle/migrations.js'), { force: true });
console.log(`migrations.ts generado con ${journal.entries.length} migración(es).`);
