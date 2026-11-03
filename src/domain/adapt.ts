/**
 * Ajuste semanal de la rutina (sugerencias, nunca cambios automáticos).
 *
 * Se analizan las DOS SEMANAS ANTERIORES COMPLETAS (lunes-domingo) para que el
 * resultado no dependa del día en que se abra la app.
 *
 * Reglas:
 *  - refuerzo: un accesorio lleva 2 semanas sin progresar y en el suelo del rango
 *    (o con RIR bajo) → sustituirlo por una variante del mismo músculo con otro
 *    equipamiento o ángulo.
 *  - avance: un ejercicio resulta muy fácil (techo del rango con RIR alto en las
 *    2 últimas sesiones) → variante más exigente; si no la hay (y no estás en
 *    déficit), una serie más.
 *  - equilibrio: un grupo muscular se queda por debajo de las series semanales
 *    objetivo aun entrenando los días previstos → una serie más o un ejercicio.
 *
 * Seguridad:
 *  - Los básicos principales no rotan nunca (permiten medir la progresión).
 *  - Máximo 2 sugerencias por día de rutina y 4 por semana.
 *  - Ningún ejercicio implicado en una sugerencia de la semana anterior.
 *  - Una sugerencia rechazada no se repite en 4 semanas.
 *  - Modo déficit: no se proponen series de más por el «avance» y se limita el volumen.
 *  - Se evitan variantes de riesgo para las lesiones indicadas en el perfil.
 */
import type { ExerciseKind, SuggestionAction, SuggestionRule, SuggestionStatus } from '@/db/schema';

import { addDays, startOfWeek } from './dates';
import { sessionStats, progressed, type HistSession } from './progression';
import { MUSCLE_GROUPS, normalize } from './search';

/** Básicos principales: fijos, nunca se proponen para rotar. */
export const CORE_LIFTS = new Set([
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Squat',
  'Front_Barbell_Squat',
  'Barbell_Deadlift',
  'Sumo_Deadlift',
  'Trap_Bar_Deadlift',
  'Romanian_Deadlift',
  'Pullups',
  'Chin-Up',
  'Bent_Over_Barbell_Row',
  'T-Bar_Row_with_Handle',
  'Standing_Military_Press',
  'Seated_Barbell_Military_Press',
]);

/** Series semanales mínimas por grupo muscular. */
export const WEEKLY_SET_TARGETS: Record<string, number> = {
  pecho: 10,
  espalda: 10,
  pierna: 12,
  hombro: 8,
  biceps: 6,
  triceps: 6,
  abs: 4,
};

export const GROUP_LABELS: Record<string, string> = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.key, g.label]));

export const MAX_PER_DAY = 2;
export const MAX_PER_WEEK = 4;
export const REJECT_COOLDOWN_DAYS = 28;

export interface LibEx {
  id: string;
  nameEs: string;
  primaryMuscles: string[];
  equipment: string | null;
  kind: ExerciseKind;
  category: string;
  curated: boolean;
}

export interface AdaptRoutineExercise {
  id: number; // routine_exercise.id
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
}

export interface AdaptRoutineDay {
  id: number;
  name: string;
  isOptional: boolean;
  exercises: AdaptRoutineExercise[];
}

export interface PastSuggestion {
  weekStart: string;
  rule: SuggestionRule;
  exerciseId: string | null;
  suggestedExerciseId: string | null;
  muscle: string | null;
  status: SuggestionStatus;
  decidedAt: number | null;
}

export interface AdaptInput {
  today: string;
  nowMs: number;
  days: AdaptRoutineDay[];
  trainingDaysPerWeek: number;
  library: Map<string, LibEx>;
  /** Historial por ejercicio (sin descargas), cronológico. */
  history: Map<string, (HistSession & { workoutId: number })[]>;
  /** Fechas de entrenos terminados (sin descargas) para medir la adherencia. */
  workoutDates: string[];
  deficitMode: boolean;
  injuries: string | null;
  past: PastSuggestion[];
}

export interface NewSuggestion {
  rule: SuggestionRule;
  action: SuggestionAction;
  routineDayId: number;
  routineExerciseId: number | null;
  exerciseId: string | null;
  suggestedExerciseId: string | null;
  setsDelta: number | null;
  muscle: string | null;
  reason: string;
}

// ───────────── Utilidades ─────────────

export function groupOf(primaryMuscles: string[]): string | null {
  const m = primaryMuscles[0];
  return MUSCLE_GROUPS.find((g) => g.muscles.includes(m))?.key ?? null;
}

const FREE_WEIGHTS = new Set(['barbell', 'dumbbell', 'body only', 'e-z curl bar', 'kettlebells']);

/** Exigencia aproximada: compuesto (+2) y peso libre (+1). */
export function difficulty(ex: Pick<LibEx, 'kind' | 'equipment'>): number {
  return (ex.kind === 'compuesto' ? 2 : 0) + (ex.equipment && FREE_WEIGHTS.has(ex.equipment) ? 1 : 0);
}

const INJURY_RULES: { keys: string[]; avoid: string[] }[] = [
  { keys: ['hombro'], avoid: ['militar', 'press de hombro', 'arnold', 'por encima de la cabeza', 'fondos', 'remo al menton', 'elevaciones frontales', 'tras nuca'] },
  { keys: ['rodilla'], avoid: ['zancada', 'bulgara', 'subidas al cajon', 'extension de cuadriceps', 'sentadilla hack', 'salto'] },
  { keys: ['espalda', 'lumbar', 'hernia'], avoid: ['peso muerto', 'buenos dias', 'remo con barra', 'hiperextensiones', 'rack pull', 'sentadilla con barra', 'sentadilla frontal', 'remo en t'] },
  { keys: ['codo'], avoid: ['press frances', 'por encima de la cabeza', 'patada de triceps', 'fondos'] },
  { keys: ['muneca'], avoid: ['press frances', 'curl de biceps con barra', 'flexiones', 'fondos', 'curl de muneca'] },
];

/** ¿Es segura la variante para las lesiones/limitaciones indicadas? */
export function isSafeForInjuries(nameEs: string, injuries: string | null): boolean {
  if (!injuries?.trim()) return true;
  const inj = normalize(injuries);
  const name = normalize(nameEs);
  return !INJURY_RULES.some((r) => r.keys.some((k) => inj.includes(k)) && r.avoid.some((a) => name.includes(a)));
}

const tokenSet = (s: string) => new Set(normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2));
function nameSimilarity(a: string, b: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / Math.max(1, new Set([...A, ...B]).size);
}

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** RIR medio si se registró en al menos la mitad de las series; si no, deducido del RPE. */
function effortRir(sessions: HistSession[]): number | null {
  const sets = sessions.flatMap((s) => s.sets).filter((s) => s.setType === 'normal' || s.setType === 'fallo');
  if (!sets.length) return null;
  const rirs = sets.map((s) => s.rir).filter((v): v is number => v != null);
  if (rirs.length >= sets.length / 2) return avg(rirs);
  const rpes = sets.map((s) => s.rpe).filter((v): v is number => v != null);
  if (rpes.length >= sets.length / 2) return 10 - avg(rpes)!;
  return null;
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

// ───────────── Generación ─────────────

export function generateSuggestions(input: AdaptInput): NewSuggestion[] {
  const ws = startOfWeek(input.today);
  const w1 = addDays(ws, -7);
  const w2 = addDays(ws, -14);
  const windowEnd = addDays(ws, -1);
  const lib = input.library;

  const routineIds = new Set(input.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  const lastWeek = input.past.filter((p) => p.weekStart === w1);
  const touchedLastWeek = new Set(lastWeek.flatMap((p) => [p.exerciseId, p.suggestedExerciseId]).filter((x): x is string => !!x));
  const recentlyRejected = (rule: SuggestionRule, key: string | null) =>
    input.past.some(
      (p) =>
        p.status === 'rechazada' &&
        p.rule === rule &&
        (p.exerciseId === key || p.muscle === key) &&
        p.decidedAt != null &&
        input.nowMs - p.decidedAt < REJECT_COOLDOWN_DAYS * 86_400_000,
    );
  const suggestedRecently = new Set(
    input.past.filter((p) => p.weekStart >= addDays(ws, -14)).map((p) => p.suggestedExerciseId).filter((x): x is string => !!x),
  );

  const candidates = (target: LibEx, pick: 'refuerzo' | 'avance'): LibEx | null => {
    const tg = target.primaryMuscles[0];
    const dt = difficulty(target);
    const pool = [...lib.values()].filter(
      (c) =>
        c.id !== target.id &&
        c.curated &&
        (c.category === 'strength' || c.category === 'powerlifting') &&
        (c.kind === 'compuesto' || c.kind === 'accesorio' || c.kind === 'abs') &&
        c.primaryMuscles[0] === tg &&
        !routineIds.has(c.id) &&
        !CORE_LIFTS.has(c.id) &&
        !touchedLastWeek.has(c.id) &&
        !suggestedRecently.has(c.id) &&
        isSafeForInjuries(c.nameEs, input.injuries),
    );
    const scored = pool
      .map((c) => {
        const dc = difficulty(c);
        let score = 0;
        if (c.equipment !== target.equipment) score += 2; // otro equipamiento
        if (nameSimilarity(c.nameEs, target.nameEs) < 0.5) score += 1; // otro ángulo
        if (pick === 'refuerzo') {
          if (Math.abs(dc - dt) <= 1) score += 1;
        } else {
          if (dc <= dt) return null; // «avance» solo variantes más exigentes
          score += dc - dt === 1 ? 2 : 1;
        }
        return { c, score };
      })
      .filter((x): x is { c: LibEx; score: number } => x != null)
      .sort((a, b) => b.score - a.score || a.c.nameEs.localeCompare(b.c.nameEs, 'es'));
    return scored[0]?.c ?? null;
  };

  const out: NewSuggestion[] = [];
  const perDay = new Map<number, number>();
  const used = new Set<string>();
  const push = (s: NewSuggestion) => {
    if (out.length >= MAX_PER_WEEK) return false;
    if ((perDay.get(s.routineDayId) ?? 0) >= MAX_PER_DAY) return false;
    for (const id of [s.exerciseId, s.suggestedExerciseId]) if (id && used.has(id)) return false;
    out.push(s);
    perDay.set(s.routineDayId, (perDay.get(s.routineDayId) ?? 0) + 1);
    for (const id of [s.exerciseId, s.suggestedExerciseId]) if (id) used.add(id);
    return true;
  };

  const usableDays = input.days.filter((d) => input.trainingDaysPerWeek >= 5 || !d.isOptional);
  const entries = usableDays.flatMap((d) => d.exercises.map((e) => ({ day: d, re: e, ex: lib.get(e.exerciseId) }))).filter((x) => x.ex);
  const eligible = (exerciseId: string) => !touchedLastWeek.has(exerciseId);

  // 1) Refuerzo
  for (const { day, re, ex } of entries) {
    if (!ex || CORE_LIFTS.has(re.exerciseId) || !eligible(re.exerciseId) || recentlyRejected('refuerzo', re.exerciseId)) continue;
    const hist = input.history.get(re.exerciseId) ?? [];
    const win = hist.filter((h) => inRange(h.date, w2, windowEnd));
    if (!win.some((h) => inRange(h.date, w2, addDays(w2, 6))) || !win.some((h) => inRange(h.date, w1, windowEnd))) continue;
    const baseline = hist.filter((h) => h.date < w2).slice(-1);
    const seq = [...baseline, ...win];
    if (seq.length < 2) continue;
    const cfg = { sets: re.sets, repMin: re.repMin, repMax: re.repMax };
    const stats = seq.map((h) => sessionStats(h, cfg));
    const noProgress = stats.slice(1).every((s, i) => !progressed(stats[i], s));
    const winStats = stats.slice(baseline.length);
    const atFloor = winStats.every((s) => (avg(s.repsAtWeight) ?? 0) <= re.repMin + 1);
    const rir = effortRir(win);
    const lowRir = rir != null && rir <= 1;
    if (!noProgress || !(atFloor || lowRir)) continue;
    const alt = candidates(ex, 'refuerzo');
    if (!alt) continue;
    const w = winStats.at(-1)?.weight;
    push({
      rule: 'refuerzo',
      action: 'sustituir',
      routineDayId: day.id,
      routineExerciseId: re.id,
      exerciseId: re.exerciseId,
      suggestedExerciseId: alt.id,
      setsDelta: null,
      muscle: groupOf(ex.primaryMuscles),
      reason: atFloor
        ? `Llevas 2 semanas en «${ex.nameEs}» sin progresar y en el mínimo del rango (${re.repMin} reps${w ? ` con ${String(w).replace('.', ',')} kg` : ''}). Un estímulo distinto puede desbloquearlo.`
        : `Llevas 2 semanas en «${ex.nameEs}» sin progresar y al límite (RIR ≈ ${Math.round(rir!)}). Prueba otra variante del mismo músculo.`,
    });
  }

  // 2) Equilibrio por grupo muscular
  const dayScale = usableDays.length ? Math.min(1, input.trainingDaysPerWeek / usableDays.length) : 1;
  const planned = new Map<string, number>();
  for (const { re, ex } of entries) {
    const g = groupOf(ex!.primaryMuscles);
    if (g) planned.set(g, (planned.get(g) ?? 0) + re.sets * dayScale);
  }
  const doneSets = new Map<string, number>();
  for (const [exerciseId, sessions] of input.history) {
    const ex = lib.get(exerciseId);
    const g = ex ? groupOf(ex.primaryMuscles) : null;
    if (!g) continue;
    for (const s of sessions) {
      if (!inRange(s.date, w2, windowEnd)) continue;
      doneSets.set(g, (doneSets.get(g) ?? 0) + s.sets.filter((x) => x.setType !== 'calentamiento' && (x.reps ?? 0) > 0).length);
    }
  }
  const sessionsInWindow = new Set(input.workoutDates.filter((d) => inRange(d, w2, windowEnd))).size;
  const adherence = input.trainingDaysPerWeek > 0 ? sessionsInWindow / (2 * input.trainingDaysPerWeek) : 0;
  if (adherence >= 0.75) {
    const setCap = input.deficitMode ? 4 : 5;
    const exerciseCap = input.deficitMode ? 7 : 8;
    // Solo grupos que la rutina trabaja, empezando por el más descompensado.
    const lacking = Object.entries(WEEKLY_SET_TARGETS)
      .filter(([g]) => (planned.get(g) ?? 0) > 0)
      .map(([g, target]) => ({ g, target, actual: (doneSets.get(g) ?? 0) / 2 }))
      .filter((x) => x.actual < x.target && !recentlyRejected('equilibrio', x.g))
      .sort((a, b) => a.actual / a.target - b.actual / b.target);
    for (const { g, target, actual } of lacking) {
      const label = GROUP_LABELS[g] ?? g;
      const reason = `${label}: ${Math.round(actual)} series por semana de media en las 2 últimas semanas, por debajo de las ${target} recomendadas.`;
      // a) Una serie más en un accesorio de ese grupo
      const acc = entries
        .filter(({ re, ex }) => groupOf(ex!.primaryMuscles) === g && !CORE_LIFTS.has(re.exerciseId) && re.sets < setCap && eligible(re.exerciseId) && isSafeForInjuries(ex!.nameEs, input.injuries))
        .sort((a, b) => a.re.sets - b.re.sets)[0];
      if (acc) {
        push({ rule: 'equilibrio', action: 'series', routineDayId: acc.day.id, routineExerciseId: acc.re.id, exerciseId: acc.re.exerciseId, suggestedExerciseId: null, setsDelta: 1, muscle: g, reason });
        continue;
      }
      // b) Un ejercicio nuevo de ese grupo en el día que ya lo trabaja (o el más corto)
      const day =
        usableDays.find((d) => d.exercises.some((e) => groupOf(lib.get(e.exerciseId)?.primaryMuscles ?? []) === g) && d.exercises.length < exerciseCap) ??
        [...usableDays].filter((d) => d.exercises.length < exerciseCap).sort((a, b) => a.exercises.length - b.exercises.length)[0];
      const model = [...lib.values()].find((c) => groupOf(c.primaryMuscles) === g && c.curated && c.kind !== 'compuesto');
      const alt = model ? candidates(model, 'refuerzo') ?? (routineIds.has(model.id) ? null : model) : null;
      if (day && alt) {
        push({ rule: 'equilibrio', action: 'anadir', routineDayId: day.id, routineExerciseId: null, exerciseId: null, suggestedExerciseId: alt.id, setsDelta: null, muscle: g, reason });
      }
    }
  }

  // 3) Avance
  for (const { day, re, ex } of entries) {
    if (!ex || !eligible(re.exerciseId) || recentlyRejected('avance', re.exerciseId)) continue;
    const hist = (input.history.get(re.exerciseId) ?? []).filter((h) => h.date >= addDays(ws, -21));
    const last2 = hist.slice(-2);
    if (last2.length < 2) continue;
    const cfg = { sets: re.sets, repMin: re.repMin, repMax: re.repMax };
    const allTop = last2.every((h) => sessionStats(h, cfg).allAtTop);
    const rir = effortRir(last2);
    if (!allTop || rir == null || rir < 3) continue;
    const reason = `«${ex.nameEs}» te resulta fácil: ${re.repMax} reps en todas las series con RIR ≈ ${Math.round(rir)} en las 2 últimas sesiones.`;
    if (!CORE_LIFTS.has(re.exerciseId)) {
      const harder = candidates(ex, 'avance');
      if (harder) {
        push({ rule: 'avance', action: 'sustituir', routineDayId: day.id, routineExerciseId: re.id, exerciseId: re.exerciseId, suggestedExerciseId: harder.id, setsDelta: null, muscle: groupOf(ex.primaryMuscles), reason });
        continue;
      }
    }
    if (!input.deficitMode && re.sets < 5 && isSafeForInjuries(ex.nameEs, input.injuries)) {
      push({ rule: 'avance', action: 'series', routineDayId: day.id, routineExerciseId: re.id, exerciseId: re.exerciseId, suggestedExerciseId: null, setsDelta: 1, muscle: groupOf(ex.primaryMuscles), reason });
    }
  }

  return out;
}
