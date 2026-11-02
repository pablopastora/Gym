// Descarga free-exercise-db (Unlicense / dominio público) y genera una versión
// reducida en src/data/free-exercise-db.json que se incluye en la app.
// Las imágenes NO se incluyen: se descargan bajo demanda y se cachean en el móvil.
//
// Uso: npm run data:import [-- <commit>]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COMMIT = process.argv[2] ?? 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const URL_JSON = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;

const res = await fetch(URL_JSON);
if (!res.ok) throw new Error(`Error ${res.status} al descargar ${URL_JSON}`);
const data = await res.json();

const slim = data.map((x) => ({
  id: x.id,
  name: x.name,
  level: x.level ?? null,
  mechanic: x.mechanic ?? null,
  equipment: x.equipment ?? null,
  primaryMuscles: x.primaryMuscles ?? [],
  secondaryMuscles: x.secondaryMuscles ?? [],
  instructions: x.instructions ?? [],
  category: x.category,
  images: x.images ?? [],
}));

const root = new URL('..', import.meta.url).pathname;
writeFileSync(
  join(root, 'src/data/free-exercise-db.json'),
  JSON.stringify({ source: 'yuhonas/free-exercise-db', commit: COMMIT, license: 'Unlicense', exercises: slim }),
);
console.log(`Importados ${slim.length} ejercicios de free-exercise-db@${COMMIT.slice(0, 7)}`);
