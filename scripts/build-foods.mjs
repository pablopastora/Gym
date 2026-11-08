/**
 * Genera src/data/foods.ts a partir de scripts/foods/base-foods.txt y de la
 * base USDA National Nutrient Database for Standard Reference, Release 28
 * (dominio público). Uso:
 *   node scripts/build-foods.mjs <ruta a ABBREV.txt de SR28>
 * (ABBREV.txt está, por ejemplo, en el paquete npm `fda-nutrient-database`).
 *
 * Hidratos: USDA da los hidratos «por diferencia» (incluyen la fibra); aquí se
 * guardan como en las etiquetas europeas, sin fibra (hidratos − fibra).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const abbrevPath = process.argv[2];
if (!abbrevPath) {
  console.error('Uso: node scripts/build-foods.mjs <ABBREV.txt>');
  process.exit(1);
}
const parse = (l) => l.replace(/\r?\n$/, '').split('^').map((f) => f.replace(/^~|~$/g, ''));
const abbrev = new Map();
for (const line of readFileSync(abbrevPath, 'latin1').split('\n')) {
  if (!line.trim()) continue;
  const f = parse(line);
  abbrev.set(f[0], f);
}
const num = (s) => (s === '' || s == null ? 0 : Number(s));
const r1 = (n) => Math.round(n * 10) / 10;
const out = [];
for (const line of readFileSync(join(root, 'scripts/foods/base-foods.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [key, name, ndb, category, tags, unit, serving] = line.split('|');
  const a = abbrev.get(ndb);
  if (!a) throw new Error(`NDB ${ndb} no encontrado (${key})`);
  const fiber = num(a[8]);
  const carbs = Math.max(0, num(a[7]) - fiber);
  const [unitLabel, unitG] = unit ? unit.split(':') : [null, null];
  out.push({
    key,
    name,
    ndb,
    category,
    tags: tags ? tags.split(',') : [],
    kcal: Math.round(num(a[3])),
    protein: r1(num(a[4])),
    carbs: r1(carbs),
    fat: r1(num(a[5])),
    fiber: r1(fiber),
    unitLabel: unitLabel || null,
    unitG: unitG ? Number(unitG) : null,
    servingG: Number(serving),
  });
}
const header = `/**
 * Alimentos básicos (valores por 100 g). GENERADO por scripts/build-foods.mjs: no editar a mano.
 * Fuente de los valores: USDA National Nutrient Database for Standard Reference,
 * Release 28 (2015), dominio público. Nombres en español, unidades y raciones: propios.
 * Hidratos sin fibra (como en las etiquetas europeas).
 */
import type { BaseFood } from '@/domain/nutrition';

export const BASE_FOODS_VERSION = 1;

export const BASE_FOODS: BaseFood[] = `;
writeFileSync(join(root, 'src/data/foods.ts'), header + JSON.stringify(out, null, 1).replace(/\n\s+/g, ' ').replace(/\[ \{/, '[\n {').replace(/\}, \{/g, '},\n {') + ';\n');
console.log(`${out.length} alimentos`);
