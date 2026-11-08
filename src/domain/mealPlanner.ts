/**
 * Recomendador de comidas local (sin IA externa ni claves de API).
 *
 * 1. Filtra los alimentos: nunca los marcados como «no me gusta» o «alergia/intolerancia»,
 *    ni los que no encajan con las preferencias de dieta (vegetariano, sin lactosa…).
 * 2. Usa plantillas simples por comida (plato de proteína + hidrato + verdura; desayuno de
 *    lácteo/huevo + cereal + fruta…), con prioridad a lo que tienes en casa y te gusta.
 * 3. Calcula las raciones para encajar en lo que te queda: primero la proteína, luego el
 *    hidrato hasta las kcal, con verdura fija por volumen y un poco de grasa si cabe.
 * 4. Puntúa: cercanía a proteína y kcal, saciedad (proteína, fibra, volumen por kcal) y preferencias.
 */
import { macrosFor, sumMacros, type FoodCategory, type Macros, type MealKey } from './nutrition';

export interface PlannerFood {
  id: number;
  /** Clave de la lista básica (para los alimentos por defecto). */
  baseKey?: string | null;
  name: string;
  category: FoodCategory | string;
  tags: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  unitG?: number | null;
  unitLabel?: string | null;
  pref?: 'gusta' | 'no_gusta' | 'alergia' | null;
  inPantry?: boolean;
  isFavorite?: boolean;
  source?: string;
  archived?: boolean;
}

export type DietFlag = 'vegetariano' | 'pescetariano' | 'sin_lactosa' | 'sin_gluten' | 'sin_frutos_secos' | 'sin_cerdo' | 'sin_marisco' | 'sin_huevo';

export const DIET_FLAGS: { key: DietFlag; label: string }[] = [
  { key: 'vegetariano', label: 'Vegetariano' },
  { key: 'pescetariano', label: 'Pescetariano' },
  { key: 'sin_lactosa', label: 'Sin lactosa' },
  { key: 'sin_gluten', label: 'Sin gluten' },
  { key: 'sin_frutos_secos', label: 'Sin frutos secos' },
  { key: 'sin_cerdo', label: 'Sin cerdo' },
  { key: 'sin_marisco', label: 'Sin marisco' },
  { key: 'sin_huevo', label: 'Sin huevo' },
];

/** ¿Se puede recomendar este alimento? (exclusiones siempre respetadas) */
export function isAllowed(f: PlannerFood, flags: readonly string[]): boolean {
  if (f.archived) return false;
  if (f.pref === 'no_gusta' || f.pref === 'alergia') return false;
  const has = (t: string) => f.tags.includes(t) || f.category === t;
  if (flags.includes('vegetariano') && (has('carne') || has('pescado') || has('marisco'))) return false;
  if (flags.includes('pescetariano') && has('carne')) return false;
  if (flags.includes('sin_lactosa') && has('lactosa')) return false;
  if (flags.includes('sin_gluten') && has('gluten')) return false;
  if (flags.includes('sin_frutos_secos') && has('frutos_secos')) return false;
  if (flags.includes('sin_cerdo') && has('cerdo')) return false;
  if (flags.includes('sin_marisco') && has('marisco')) return false;
  if (flags.includes('sin_huevo') && has('huevo')) return false;
  return true;
}

export type Role = 'proteina' | 'hidrato' | 'verdura' | 'fruta' | 'grasa';

/** Alimentos habituales que se usan si no has marcado ninguno de ese tipo. */
export const DEFAULT_PICKS: Record<Role, string[]> = {
  proteina: [
    'pollo_pechuga_plancha', 'pavo_pechuga_cruda', 'ternera_filete_plancha', 'cerdo_lomo_plancha', 'merluza_cocinada', 'salmon_cocinado',
    'atun_natural', 'bacalao_cocinado', 'gambas_cocidas', 'huevo', 'clara_huevo', 'tofu', 'yogur_griego_0', 'queso_fresco_batido', 'skyr',
    'pavo_fiambre', 'jamon_cocido_extra', 'requeson',
  ],
  hidrato: [
    'arroz_cocido', 'arroz_integral_cocido', 'pasta_integral_cocida', 'pasta_cocida', 'patata_cocida', 'boniato', 'quinoa_cocida',
    'garbanzos_cocidos', 'lentejas_cocidas', 'cuscus_cocido', 'pan_integral', 'avena', 'pan_blanco', 'tortitas_arroz',
  ],
  verdura: [
    'brocoli_cocido', 'judias_verdes_cocidas', 'calabacin_cocinado', 'champinones_cocinados', 'espinacas_cocidas', 'lechuga', 'tomate',
    'pimiento_rojo', 'coliflor', 'esparragos', 'menestra', 'pepino', 'berenjena', 'zanahoria',
  ],
  fruta: ['manzana', 'platano', 'naranja', 'fresas', 'kiwi', 'pera', 'arandanos', 'mandarina', 'melocoton', 'frambuesas'],
  grasa: ['aceite_oliva', 'aguacate', 'almendras', 'nueces'],
};

const proteinRatio = (f: PlannerFood) => (f.kcal > 0 ? (f.protein * 4) / f.kcal : 0);

/** Papel del alimento en un plato (o null si no se usa en las plantillas). */
export function roleOf(f: PlannerFood): Role | null {
  const c = f.category;
  if (c === 'verdura') return f.unitG != null && f.unitG < 10 ? null : 'verdura'; // ajo y similares no son plato
  if (c === 'fruta') return 'fruta';
  if (c === 'grasa' || c === 'frutos_secos') return f.protein * 4 > f.kcal * 0.3 ? null : 'grasa';
  if (['carne', 'pescado', 'marisco', 'huevo', 'lacteo', 'legumbre'].includes(c) && proteinRatio(f) >= 0.35) return 'proteina';
  if (c === 'cereal' || c === 'tuberculo' || c === 'legumbre') return f.carbs * 4 >= f.kcal * 0.45 ? 'hidrato' : null;
  return null;
}

/** Límites de gramos razonables por papel (para que las raciones sean comibles). */
function bounds(f: PlannerFood, role: Role): [number, number] {
  if (role === 'proteina') {
    if (f.category === 'lacteo') return f.kcal > 300 ? [20, 40] : [125, 450]; // proteína en polvo / lácteos
    if (f.category === 'huevo') return [100, 300];
    return [60, 280];
  }
  if (role === 'hidrato') return f.kcal > 250 ? [25, 130] : [60, 380]; // en seco / cocido
  if (role === 'verdura') return [100, 300];
  if (role === 'fruta') return [100, 250];
  return f.kcal > 800 ? [0, 15] : [0, 30]; // aceite / frutos secos
}

type Slot = { role: Role; optional?: boolean; fixedG?: number };

/** Plantillas por comida. */
export const TEMPLATES: Record<MealKey, Slot[]> = {
  desayuno: [{ role: 'proteina' }, { role: 'hidrato' }, { role: 'fruta', fixedG: 150 }],
  comida: [{ role: 'proteina' }, { role: 'hidrato' }, { role: 'verdura', fixedG: 200 }, { role: 'grasa', optional: true }],
  merienda: [{ role: 'proteina' }, { role: 'fruta', fixedG: 150 }, { role: 'grasa', optional: true }],
  cena: [{ role: 'proteina' }, { role: 'hidrato' }, { role: 'verdura', fixedG: 250 }, { role: 'grasa', optional: true }],
  snacks: [{ role: 'proteina' }, { role: 'fruta', fixedG: 120 }],
};

/** Proteínas que encajan en cada comida (no pechuga de pollo para desayunar). */
function proteinFitsMeal(f: PlannerFood, meal: MealKey): boolean {
  const light = f.category === 'lacteo' || f.category === 'huevo' || /fiambre|jamón cocido/i.test(f.name);
  if (meal === 'desayuno' || meal === 'merienda' || meal === 'snacks') return light;
  return f.category !== 'lacteo' || f.kcal < 120; // comida/cena: sí un yogur proteico, no la proteína en polvo
}

function hidratoFitsMeal(f: PlannerFood, meal: MealKey): boolean {
  const breakfasty = /avena|pan|tostad|tortitas|copos|muesli|cereales/i.test(f.name);
  if (meal === 'desayuno') return breakfasty;
  return !/copos|cereales|muesli/i.test(f.name) && !/^harina/i.test(f.name);
}

export const MEAL_SHARE: Record<MealKey, number> = { desayuno: 0.25, comida: 0.35, merienda: 0.1, cena: 0.3, snacks: 0 };

/**
 * Objetivo de una comida a partir de lo que queda del día: el reparto habitual entre
 * las comidas que aún no tienen registros (si es la última, todo lo que queda).
 */
export function mealTarget(p: { meal: MealKey; remaining: { kcal: number; protein: number; fat: number }; loggedMeals: MealKey[] }): { kcal: number; protein: number; fat: number } {
  const pending = (Object.keys(MEAL_SHARE) as MealKey[]).filter((m) => MEAL_SHARE[m] > 0 && (m === p.meal || !p.loggedMeals.includes(m)));
  const total = pending.reduce((a, m) => a + MEAL_SHARE[m], 0);
  const share = p.meal === 'snacks' ? 0.1 : total > 0 ? MEAL_SHARE[p.meal] / total : 1;
  return {
    kcal: Math.max(0, p.remaining.kcal * share),
    protein: Math.max(0, p.remaining.protein * share),
    fat: Math.max(0, p.remaining.fat * share),
  };
}

export interface PlanItem {
  food: PlannerFood;
  role: Role;
  grams: number;
  macros: Macros;
}

export interface MealOption {
  items: PlanItem[];
  total: Macros;
  score: number;
  steps: string[];
  key: string;
}

function preferenceBonus(f: PlannerFood): number {
  return (f.inPantry ? 3 : 0) + (f.pref === 'gusta' ? 2 : 0) + (f.isFavorite ? 1 : 0);
}

function roundG(f: PlannerFood, g: number, role: Role): number {
  if (f.unitG && (f.category === 'huevo' || role === 'fruta')) return Math.max(1, Math.round(g / f.unitG)) * f.unitG;
  const step = g < 40 ? 5 : 10;
  return Math.round(g / step) * step;
}

const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));

/** Raciones de una combinación para acercarse a la proteína y a las kcal objetivo. */
export function portion(slots: { food: PlannerFood; slot: Slot }[], target: { kcal: number; protein: number; fat: number }): PlanItem[] {
  const g = new Map<number, number>();
  const role = (i: number) => slots[i].slot.role;
  slots.forEach((s, i) => g.set(i, s.slot.fixedG ?? (role(i) === 'grasa' ? 0 : bounds(s.food, role(i))[0])));
  const macrosAt = (i: number) => macrosFor(slots[i].food, g.get(i)!);
  const sumExcept = (skip: number[]) => sumMacros(slots.map((_, i) => (skip.includes(i) ? {} : macrosAt(i))));
  const pi = slots.findIndex((s) => s.slot.role === 'proteina');
  const ci = slots.findIndex((s) => s.slot.role === 'hidrato');
  const fi = slots.findIndex((s) => s.slot.role === 'grasa');
  for (let it = 0; it < 4; it++) {
    if (pi >= 0) {
      const rest = sumExcept([pi]);
      const f = slots[pi].food;
      // La proteína del plato sale sobre todo de la fuente principal (el resto aporta como mucho un 25 %).
      const fromRest = Math.min(rest.protein, target.protein * 0.25);
      g.set(pi, clamp(((target.protein - fromRest) / Math.max(1, f.protein)) * 100, bounds(f, 'proteina')));
    }
    if (fi >= 0) {
      const rest = sumExcept([fi]);
      const f = slots[fi].food;
      const room = Math.min(target.fat - rest.fat, (target.kcal - rest.kcal) / 9);
      g.set(fi, clamp((Math.max(0, room) / Math.max(1, f.fat)) * 100 * 0.6, bounds(f, 'grasa')));
    }
    if (ci >= 0) {
      const rest = sumExcept([ci]);
      const f = slots[ci].food;
      g.set(ci, clamp(((target.kcal - rest.kcal) / Math.max(1, f.kcal)) * 100, bounds(f, 'hidrato')));
    }
  }
  return slots
    .map((s, i) => {
      const grams = roundG(s.food, g.get(i)!, s.slot.role);
      return { food: s.food, role: s.slot.role, grams, macros: macrosFor(s.food, grams) };
    })
    .filter((x) => x.grams > 0);
}

function scoreOption(items: PlanItem[], target: { kcal: number; protein: number; fat: number }): number {
  const t = sumMacros(items.map((i) => i.macros));
  const pErr = target.protein > 0 ? Math.max(0, target.protein - t.protein) / target.protein + Math.max(0, t.protein - target.protein * 1.4) / target.protein : 0;
  const kErr = target.kcal > 0 ? Math.abs(t.kcal - target.kcal) / target.kcal : 0;
  const over = target.kcal > 0 ? Math.max(0, t.kcal - target.kcal * 1.08) / target.kcal : 0;
  const grams = items.reduce((a, i) => a + i.grams, 0);
  // Saciedad: proteína, fibra y volumen (gramos) por kcal.
  const satiety = t.kcal > 0 ? (t.protein * 4) / t.kcal + (t.fiber * 20) / t.kcal + Math.min(1, grams / Math.max(1, t.kcal)) * 0.5 : 0;
  const prefs = items.reduce((a, i) => a + preferenceBonus(i.food), 0);
  return 4 * pErr + 2 * kErr + 3 * over - 0.8 * satiety - 0.08 * prefs;
}

const LABEL_G = (i: PlanItem) => {
  if (i.food.unitG && i.food.unitLabel && (i.food.category === 'huevo' || i.role === 'fruta')) {
    const n = Math.round(i.grams / i.food.unitG);
    return `${n} × ${i.food.unitLabel.replace(/^1\s+/, '')} (${i.grams} g)`;
  }
  return `${i.grams} g`;
};

export function itemText(i: PlanItem): string {
  return `${i.food.name}: ${LABEL_G(i)}`;
}

/** Receta corta de preparación según el tipo de alimento. */
export function preparationSteps(items: PlanItem[]): string[] {
  const out: string[] = [];
  const raw = (f: PlannerFood) => /\(crud[oa]s?\)/i.test(f.name);
  for (const i of items) {
    const n = i.food.name.replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
    const c = i.food.category;
    if (i.role === 'proteina') {
      if (c === 'carne') out.push(`Haz ${i.grams} g de ${n} a la plancha o al horno con sal, pimienta y especias${raw(i.food) ? ' (peso en crudo)' : ''}.`);
      else if (c === 'pescado' || c === 'marisco') out.push(`Cocina ${i.grams} g de ${n} a la plancha, al horno o al vapor con limón y perejil${raw(i.food) ? ' (peso en crudo)' : ''}.`);
      else if (c === 'huevo') out.push(`Prepara ${n} en tortilla, revuelto o cocido (${LABEL_G(i)}).`);
      else if (c === 'lacteo') out.push(`Sirve ${i.grams} g de ${n} en un bol.`);
      else out.push(`Saltea ${i.grams} g de ${n} con ajo, pimentón o salsa de soja.`);
    } else if (i.role === 'hidrato') {
      if (raw(i.food)) out.push(`Cuece ${i.grams} g de ${n} (peso en crudo) según el paquete.`);
      else if (c === 'tuberculo') out.push(`Asa, cuece o haz al microondas ${i.grams} g de ${n}.`);
      else out.push(`Acompaña con ${i.grams} g de ${n}.`);
    } else if (i.role === 'verdura') out.push(`Saltea, haz al vapor o en ensalada ${i.grams} g de ${n} (volumen que sacia con pocas kcal).`);
    else if (i.role === 'fruta') out.push(`De postre o para acompañar: ${LABEL_G(i)} de ${n}.`);
    else out.push(`Aliña o completa con ${i.grams} g de ${n}.`);
  }
  return out;
}

/**
 * Propone opciones para una comida. `exclude`: claves de opciones ya vistas («Otra opción»).
 * Devuelve hasta `count` opciones con proteína principal distinta.
 */
export function suggestMeals(p: {
  foods: PlannerFood[];
  flags: readonly string[];
  meal: MealKey;
  target: { kcal: number; protein: number; fat: number };
  count?: number;
  exclude?: Set<string>;
}): MealOption[] {
  const count = p.count ?? 3;
  const allowed = p.foods.filter((f) => isAllowed(f, p.flags) && f.source !== 'receta');
  const marked = (f: PlannerFood) => f.inPantry || f.pref === 'gusta' || f.isFavorite;
  const byRole = (role: Role, extra: (f: PlannerFood) => boolean = () => true) => {
    const all = allowed.filter((f) => roleOf(f) === role && extra(f));
    const mine = all.filter(marked);
    // Si has marcado alimentos de este tipo, se combinan esos; si no, los habituales de la lista básica.
    if (mine.length) return mine.sort((a, b) => preferenceBonus(b) - preferenceBonus(a) || a.name.localeCompare(b.name, 'es')).slice(0, 12);
    const order = DEFAULT_PICKS[role];
    const defaults = all.filter((f) => f.baseKey && order.includes(f.baseKey)).sort((a, b) => order.indexOf(a.baseKey!) - order.indexOf(b.baseKey!));
    return (defaults.length ? defaults : all).slice(0, 12);
  };
  const template = TEMPLATES[p.meal];
  const pools = template.map((slot) =>
    byRole(slot.role, slot.role === 'proteina' ? (f) => proteinFitsMeal(f, p.meal) : slot.role === 'hidrato' ? (f) => hidratoFitsMeal(f, p.meal) : slot.role === 'grasa' ? (f) => (p.meal === 'merienda' ? f.kcal <= 800 : f.kcal > 800) : () => true),
  );
  // Combinaciones (con límite) de los slots obligatorios; la grasa opcional, la mejor de su lista o ninguna.
  const options: MealOption[] = [];
  const req = template.map((s, i) => ({ s, i })).filter(({ s }) => !s.optional);
  if (req.some(({ i }) => !pools[i].length)) return [];
  const combos: number[][] = [[]];
  for (const { i } of req) {
    const next: number[][] = [];
    for (const c of combos) for (const f of pools[i].slice(0, 8)) next.push([...c, f.id]);
    combos.splice(0, combos.length, ...next.slice(0, 600));
  }
  const byId = new Map(allowed.map((f) => [f.id, f]));
  const fat = template.findIndex((s) => s.optional);
  for (const ids of combos) {
    const slots = req.map(({ s }, k) => ({ food: byId.get(ids[k])!, slot: s }));
    const variants = fat >= 0 && pools[fat].length ? [slots, [...slots, { food: pools[fat][0], slot: template[fat] }]] : [slots];
    for (const v of variants) {
      const items = portion(v, p.target);
      const key = items.map((i) => i.food.id).join('-');
      if (p.exclude?.has(key)) continue;
      options.push({ items, total: sumMacros(items.map((i) => i.macros)), score: scoreOption(items, p.target), steps: preparationSteps(items), key });
    }
  }
  // Selección voraz con variedad: proteína principal distinta y penalización por repetir el resto.
  const out: MealOption[] = [];
  const usedProtein = new Set<number>();
  const usedOther = new Map<number, number>();
  const remaining = [...options];
  while (out.length < count && remaining.length) {
    let best = -1;
    let bestScore = Infinity;
    remaining.forEach((o, idx) => {
      const prot = o.items.find((i) => i.role === 'proteina')?.food.id ?? -1;
      if (usedProtein.has(prot)) return;
      const rep = o.items.filter((i) => i.role !== 'proteina').reduce((a, i) => a + (usedOther.get(i.food.id) ?? 0), 0);
      const sc = o.score + 0.25 * rep;
      if (sc < bestScore) {
        bestScore = sc;
        best = idx;
      }
    });
    if (best < 0) break;
    const [o] = remaining.splice(best, 1);
    usedProtein.add(o.items.find((i) => i.role === 'proteina')?.food.id ?? -1);
    for (const i of o.items) if (i.role !== 'proteina') usedOther.set(i.food.id, (usedOther.get(i.food.id) ?? 0) + 1);
    out.push(o);
  }
  return out;
}

// ---------- Compartir el plan del día ----------

export function dayPlanText(p: {
  dateLabel: string;
  target: { kcal: number; protein: number; carbs: number; fat: number } | null;
  consumed: Macros;
  spent: number | null;
  meals: { label: string; items: { name: string; grams: number | null; kcal: number }[] }[];
  flags: string[];
  likes: string[];
  pantry: string[];
  excluded: string[];
}): string {
  const r = (n: number) => Math.round(n).toLocaleString('es-ES');
  const lines: string[] = [`Mi plan de comidas · ${p.dateLabel}`];
  if (p.target) {
    lines.push(`Objetivo: ${r(p.target.kcal)} kcal · proteína ${r(p.target.protein)} g · hidratos ${r(p.target.carbs)} g · grasas ${r(p.target.fat)} g (estoy en déficit para perder grasa manteniendo músculo)`);
  }
  lines.push(`Llevo: ${r(p.consumed.kcal)} kcal · proteína ${r(p.consumed.protein)} g · hidratos ${r(p.consumed.carbs)} g · grasas ${r(p.consumed.fat)} g`);
  if (p.target) {
    lines.push(
      `Me queda: ${r(Math.max(0, p.target.kcal - p.consumed.kcal))} kcal · proteína ${r(Math.max(0, p.target.protein - p.consumed.protein))} g · hidratos ${r(Math.max(0, p.target.carbs - p.consumed.carbs))} g · grasas ${r(Math.max(0, p.target.fat - p.consumed.fat))} g`,
    );
  }
  if (p.spent != null) lines.push(`Gasto estimado hoy: ~${r(p.spent)} kcal`);
  const logged = p.meals.filter((m) => m.items.length);
  if (logged.length) {
    lines.push('', 'Lo que he comido:');
    for (const m of logged) lines.push(`- ${m.label}: ${m.items.map((i) => `${i.name}${i.grams != null ? ` (${r(i.grams)} g)` : ''}`).join(', ')}`);
  }
  if (p.flags.length) lines.push('', `Preferencias: ${p.flags.join(', ')}`);
  if (p.likes.length) lines.push(`Me gusta: ${p.likes.slice(0, 20).join(', ')}`);
  if (p.pantry.length) lines.push(`Tengo en casa: ${p.pantry.slice(0, 25).join(', ')}`);
  if (p.excluded.length) lines.push(`No como (no me gusta / alergia): ${p.excluded.join(', ')}`);
  lines.push('', '¿Qué me propones para lo que me queda hoy? Prioriza la proteína y que sacie.', '(Valores estimados con mi app; no es consejo médico.)');
  return lines.join('\n');
}
