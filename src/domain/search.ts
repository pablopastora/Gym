/** Normaliza texto para búsquedas: minúsculas y sin tildes. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Coincide si todas las palabras de la consulta aparecen en alguno de los textos. */
export function matchesQuery(query: string, ...texts: (string | null | undefined)[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalize(texts.filter(Boolean).join(' '));
  return words.every((w) => hay.includes(w));
}

/** Grupos musculares para los filtros rápidos. */
export const MUSCLE_GROUPS: { key: string; label: string; muscles: string[] }[] = [
  { key: 'pecho', label: 'Pecho', muscles: ['chest'] },
  { key: 'espalda', label: 'Espalda', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  { key: 'hombro', label: 'Hombro', muscles: ['shoulders'] },
  { key: 'biceps', label: 'Bíceps', muscles: ['biceps', 'forearms'] },
  { key: 'triceps', label: 'Tríceps', muscles: ['triceps'] },
  { key: 'pierna', label: 'Pierna', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'] },
  { key: 'abs', label: 'Abdominales', muscles: ['abdominals'] },
];
