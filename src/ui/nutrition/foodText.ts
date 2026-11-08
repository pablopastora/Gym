import { fmtNum } from '@/domain/format';

/** Línea de detalle de un alimento: marca, kcal por 100 g, macros y origen. */
export function foodSubtitle(f: { kcal: number; protein: number; carbs: number; fat: number; brand?: string | null; source?: string }) {
  const src = f.source === 'off' ? ' · OFF' : f.source === 'propio' ? ' · propio' : f.source === 'receta' ? ' · receta' : '';
  return `${f.brand ? `${f.brand} · ` : ''}${fmtNum(f.kcal, 0)} kcal/100 g · P ${fmtNum(f.protein, 1)} · H ${fmtNum(f.carbs, 1)} · G ${fmtNum(f.fat, 1)}${src}`;
}

