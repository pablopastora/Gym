/**
 * Búsqueda de vídeos en wger (CC-BY-SA). Funciones puras: construir la consulta
 * y elegir el vídeo a partir de las respuestas de la API.
 *
 * Formato actual (wger ≥ 2.6): GET /api/v2/exerciseinfo/?name__search=…&language__code=en
 *   → { results: [{ id, translations: [{ name, language }], videos: [{ video, is_main,
 *        license_title, license_author, … }] }] }
 * Formato antiguo: GET /api/v2/exercise/search/?term=…  → { suggestions: [{ value, data: { base_id | id } }] }
 *   y luego GET /api/v2/video/?exercise=<id> (o exercise_base=<id>) → { results: [{ video, … }] }
 *
 * Criterio conservador: mejor ningún vídeo que uno de otro ejercicio.
 */
import { normalize } from './search';

export const WGER_API = 'https://wger.de/api/v2';

/** Palabras que no ayudan a identificar el movimiento. */
const NOISE = new Set(['medium', 'grip', 'with', 'the', 'a', 'on', 'of', 'to', 'and', 'version', 'attachment', 'machine']);

export function tokens(name: string): string[] {
  return normalize(name)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NOISE.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t)); // plural simple
}

/** Texto de búsqueda: nombre en inglés sin variantes tras « - » ni paréntesis. */
export function searchQuery(nameEn: string): string {
  return nameEn.split(' - ')[0].replace(/\(.*?\)/g, '').replace(/_/g, ' ').trim();
}

/**
 * Puntuación de coincidencia entre nuestro nombre y el de wger (0-1).
 * 1 = mismos términos. Si todos los términos de wger (≥ 2) están en el nuestro,
 * se acepta con una puntuación proporcional a cuánto cubre.
 */
export function matchScore(ours: string, theirs: string): number {
  // wger suele añadir aclaraciones entre paréntesis («Leg Curls (laying)»): se prueba también sin ellas.
  const stripped = theirs.replace(/\(.*?\)/g, '').trim();
  return Math.max(rawScore(ours, theirs), stripped && stripped !== theirs ? rawScore(ours, stripped) : 0);
}

function rawScore(ours: string, theirs: string): number {
  const a = new Set(tokens(ours));
  const b = new Set(tokens(theirs));
  if (!a.size || !b.size) return 0;
  const inter = [...b].filter((t) => a.has(t)).length;
  if (inter === a.size && inter === b.size) return 1;
  if (inter === b.size && b.size >= 2) return 0.75 + 0.25 * (b.size / a.size);
  const jaccard = inter / new Set([...a, ...b]).size;
  return jaccard;
}

export const MIN_SCORE = 0.75;

export interface WgerVideo {
  url: string;
  attribution: string;
  wgerExerciseId: number | null;
}

interface RawVideo {
  video?: string;
  is_main?: boolean;
  license_title?: string;
  license_author?: string;
  license?: number;
}

function attributionOf(v: RawVideo): string {
  const author = v.license_author?.trim() || 'comunidad wger';
  const lic = v.license_title?.trim() || 'CC-BY-SA';
  return `Vídeo: ${author} · ${lic} · wger.de`;
}

function bestVideo(videos: RawVideo[] | undefined): RawVideo | null {
  const valid = (videos ?? []).filter((v) => typeof v.video === 'string' && /^https?:\/\//.test(v.video));
  return valid.find((v) => v.is_main) ?? valid[0] ?? null;
}

/** Formato actual: elige el ejercicio mejor emparejado que tenga vídeo. */
export function pickFromExerciseInfo(json: unknown, nameEn: string): WgerVideo | null {
  const results = (json as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return null;
  let best: { score: number; v: RawVideo; id: number | null } | null = null;
  for (const r of results as { id?: number; translations?: { name?: string }[]; videos?: RawVideo[] }[]) {
    const v = bestVideo(r.videos);
    if (!v) continue;
    const score = Math.max(0, ...(r.translations ?? []).map((t) => (t.name ? matchScore(nameEn, t.name) : 0)));
    if (score >= MIN_SCORE && (!best || score > best.score)) best = { score, v, id: r.id ?? null };
  }
  return best ? { url: best.v.video!, attribution: attributionOf(best.v), wgerExerciseId: best.id } : null;
}

/** Formato antiguo, paso 1: id del ejercicio mejor emparejado entre las sugerencias. */
export function pickFromSuggestions(json: unknown, nameEn: string): number | null {
  const sugg = (json as { suggestions?: unknown[] })?.suggestions;
  if (!Array.isArray(sugg)) return null;
  let best: { score: number; id: number } | null = null;
  for (const s of sugg as { value?: string; data?: { base_id?: number; exercise_base_id?: number; id?: number; name?: string } }[]) {
    const id = s.data?.base_id ?? s.data?.exercise_base_id ?? s.data?.id;
    const name = s.value ?? s.data?.name;
    if (id == null || !name) continue;
    const score = matchScore(nameEn, name);
    if (score >= MIN_SCORE && (!best || score > best.score)) best = { score, id };
  }
  return best?.id ?? null;
}

/** Formato antiguo, paso 2: vídeo de la lista /video/. */
export function pickFromVideoList(json: unknown, wgerExerciseId: number): WgerVideo | null {
  const results = (json as { results?: RawVideo[] })?.results;
  if (!Array.isArray(results)) return null;
  const v = bestVideo(results);
  return v ? { url: v.video!, attribution: attributionOf(v), wgerExerciseId } : null;
}

/** Días tras los que se vuelve a buscar si no se encontró vídeo. */
export const RECHECK_DAYS = 30;

export function shouldLookup(ex: { videoUrl: string | null; videoCheckedAt: number | null; nameEn: string | null }, now: number): boolean {
  if (ex.videoUrl || !ex.nameEn) return false;
  if (ex.videoCheckedAt == null) return true;
  return now - ex.videoCheckedAt > RECHECK_DAYS * 86_400_000;
}
