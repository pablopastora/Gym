import type { NewExercise } from '@/db/schema';
import { classifyKind, classifyRegion } from '@/domain/exerciseClassify';

import { CURATED } from './curated';
import fedb from './free-exercise-db.json';

export const FEDB_IMAGE_BASE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${fedb.commit}/exercises/`;

export const FEDB_ATTRIBUTION =
  'Imagen: free-exercise-db (github.com/yuhonas/free-exercise-db), dominio público (Unlicense).';

/** Convierte una ruta de imagen almacenada en URL absoluta. */
export function exerciseImageUrl(path: string): string {
  return /^(https?|file):/.test(path) ? path : FEDB_IMAGE_BASE + path;
}

export interface FedbExercise {
  id: string;
  name: string;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

/**
 * Construye las filas de la biblioteca a partir de free-exercise-db + fichas curadas.
 * Los campos propios del usuario (favorito, foto) no se incluyen: se preservan al actualizar.
 */
export function buildExerciseLibrary(source: FedbExercise[] = fedb.exercises as FedbExercise[]): NewExercise[] {
  return source.map((x) => {
    const c = CURATED[x.id];
    return {
      id: x.id,
      nameEs: c?.nameEs ?? x.name,
      nameEn: x.name,
      source: 'free-exercise-db',
      curated: !!c,
      primaryMuscles: x.primaryMuscles,
      secondaryMuscles: x.secondaryMuscles,
      equipment: x.equipment,
      category: x.category,
      level: x.level,
      bodyRegion: classifyRegion(x.primaryMuscles),
      kind: c?.kind ?? classifyKind(x),
      defaultRestS: c?.restS ?? null,
      instructions: c?.instructions ?? x.instructions,
      commonErrors: c?.commonErrors ?? [],
      techniqueNote: c?.techniqueNote ?? null,
      images: x.images,
      videoUrl: null,
      mediaAttribution: FEDB_ATTRIBUTION,
    } satisfies NewExercise;
  });
}

/** URL de búsqueda en YouTube para ver la técnica. */
export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} técnica`)}`;
}
