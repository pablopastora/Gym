/**
 * Búsqueda de vídeos de técnica en wger.de desde el móvil (decisión 6a).
 * Se hace la primera vez que se abre la ficha de un ejercicio; el resultado
 * (o «no hay vídeo») se guarda para no repetir la búsqueda en cada visita.
 * Los vídeos se reproducen con la caché de expo-video: tras verlos una vez no
 * se vuelven a descargar.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import {
  pickFromExerciseInfo,
  pickFromSuggestions,
  pickFromVideoList,
  searchQuery,
  WGER_API,
  type WgerVideo,
} from '@/domain/wger';

const TIMEOUT_MS = 8000;

async function getJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Busca un vídeo para el ejercicio. Lanza error solo si falla la red (para reintentar más tarde). */
export async function findWgerVideo(nameEn: string): Promise<WgerVideo | null> {
  const q = encodeURIComponent(searchQuery(nameEn));
  // 1) API actual: búsqueda por nombre con los vídeos incluidos.
  const info = await getJson(`${WGER_API}/exerciseinfo/?name__search=${q}&language__code=en&limit=10`);
  const found = pickFromExerciseInfo(info, nameEn);
  if (found) return found;
  if (info && Array.isArray((info as { results?: unknown }).results)) return null; // la API respondió: no hay vídeo
  // 2) API antigua (por si el servidor usa una versión anterior).
  const sugg = await getJson(`${WGER_API}/exercise/search/?term=${q}&language=en`);
  const id = pickFromSuggestions(sugg, nameEn);
  if (id == null) return null;
  for (const param of ['exercise', 'exercise_base']) {
    const list = await getJson(`${WGER_API}/video/?${param}=${id}`);
    const v = pickFromVideoList(list, id);
    if (v) return v;
  }
  return null;
}

/** Busca y guarda el resultado en la ficha. Si no hay conexión, no marca nada y se reintenta otro día. */
export async function lookupAndStoreVideo(exerciseId: string, nameEn: string): Promise<void> {
  let result: WgerVideo | null;
  try {
    result = await findWgerVideo(nameEn);
  } catch {
    return; // sin red o tiempo agotado: se intentará en la próxima visita
  }
  await db
    .update(exercise)
    .set({ videoUrl: result?.url ?? null, videoAttribution: result?.attribution ?? null, videoCheckedAt: Date.now() })
    .where(eq(exercise.id, exerciseId));
}
