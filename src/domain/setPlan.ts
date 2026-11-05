/**
 * Plan automático de series (objetivo: perder grasa y mantener/ganar músculo en déficit).
 *
 * La app decide, para cada ejercicio de la sesión:
 *  - su ROL (básico pesado, accesorio o aislamiento), editable por el usuario;
 *  - qué series son de calentamiento (solo el primer básico de cada músculo, 40/60/80 %);
 *  - el RIR objetivo según la semana del mesociclo de 4 semanas (S1 RIR 3 … S4 descarga);
 *  - la serie top + series de descarga (−9 %) en básicos, si se activa en la rutina;
 *  - si la última serie va «al fallo» o es un dropset (−22 % y −40 %, sin descanso):
 *    solo en aislamientos o máquinas/polea, nunca en básicos ni ejercicios de riesgo,
 *    máximo 2 por sesión (1 en déficit, 0 en la semana 1 y en la descarga).
 *
 * No toca el número de series ni el rango de reps de la rutina ni el peso/reps que
 * calcula la doble progresión: solo asigna tipos, calentamientos y RIR objetivo.
 */
import type { ExerciseKind, ExerciseRole } from '@/db/schema';

import { CORE_LIFTS, isSafeForInjuries } from './adapt';
import { addDays, diffDays, startOfWeek } from './dates';
import { fmtNum } from './format';
import { roundTo, warmupPlan, type PlannedSet } from './workout';

export const ROLE_LABELS: Record<ExerciseRole, string> = {
  basico: 'Básico pesado',
  accesorio: 'Accesorio',
  aislamiento: 'Aislamiento',
};

/** Rol por defecto según patrón de movimiento y equipamiento. */
export function defaultRole(ex: { id: string; kind: ExerciseKind; equipment: string | null }): ExerciseRole {
  if (CORE_LIFTS.has(ex.id)) return 'basico';
  if (ex.kind === 'compuesto') return ex.equipment === 'barbell' ? 'basico' : 'accesorio';
  return 'aislamiento';
}

export function resolveRole(ex: { id: string; kind: ExerciseKind; equipment: string | null; roleOverride?: ExerciseRole | null }): ExerciseRole {
  return ex.roleOverride ?? defaultRole(ex);
}

/** Esquema recomendado por rol (se aplica al añadir el ejercicio o con un botón). */
export function recommendedScheme(role: ExerciseRole, deficit: boolean) {
  switch (role) {
    case 'basico':
      return { sets: deficit ? 3 : 4, repMin: 5, repMax: 8 };
    case 'accesorio':
      return { sets: 3, repMin: 8, repMax: 12 };
    default:
      return { sets: 3, repMin: 12, repMax: 15 };
  }
}

const RISKY_NAMES = /sentadilla|peso muerto|press de banca con barra|buenos d[ií]as|rack pull/i;

/** ¿Se permite al fallo / dropset en este ejercicio? */
export function allowsIntensityTechnique(ex: { id: string; nameEs: string; kind: ExerciseKind; equipment: string | null }, role: ExerciseRole) {
  if (role === 'basico' || CORE_LIFTS.has(ex.id)) return false;
  if (RISKY_NAMES.test(ex.nameEs)) return false;
  if (ex.equipment === 'barbell' && ex.kind === 'compuesto') return false;
  return role === 'aislamiento' || ex.equipment === 'machine' || ex.equipment === 'cable';
}

// ───────────── Mesociclo de 4 semanas ─────────────

export type MesoWeek = 1 | 2 | 3 | 4;

/**
 * Semana del mesociclo. Empieza la semana siguiente a la última descarga (o en
 * `mesoStart` / la semana del primer entreno). A partir de la 4.ª toca descarga.
 */
export function mesoWeek(today: string, p: { lastDeloadDate?: string | null; mesoStart?: string | null; firstWorkoutDate?: string | null }): MesoWeek {
  // Empieza la semana siguiente a la última descarga o en el reinicio manual (lo más reciente).
  const afterDeload = p.lastDeloadDate ? addDays(startOfWeek(p.lastDeloadDate), 7) : null;
  const manual = p.mesoStart ? startOfWeek(p.mesoStart) : null;
  const start =
    afterDeload && manual ? (afterDeload > manual ? afterDeload : manual) : (afterDeload ?? manual ?? startOfWeek(p.firstWorkoutDate ?? today));
  if (today < start) return afterDeload === start ? 4 : 1; // aún en la descarga (o reinicio en el futuro)
  const w = Math.floor(diffDays(start, today) / 7) + 1;
  return Math.min(4, Math.max(1, w)) as MesoWeek;
}

export const MESO_WEEK_LABELS: Record<MesoWeek, string> = {
  1: 'Semana 1 de 4 · RIR 3 (acumulación)',
  2: 'Semana 2 de 4 · RIR 2',
  3: 'Semana 3 de 4 · RIR 1-2 (la más dura)',
  4: 'Semana 4 de 4 · descarga',
};

const RIR_TABLE: Record<1 | 2 | 3, Record<ExerciseRole, number>> = {
  1: { basico: 3, accesorio: 2.5, aislamiento: 2 },
  2: { basico: 2.5, accesorio: 2, aislamiento: 1 },
  3: { basico: 2, accesorio: 1.5, aislamiento: 0.5 },
};

export function rirTarget(role: ExerciseRole, week: MesoWeek, opts: { deload?: boolean; conservative?: boolean } = {}): number {
  if (opts.deload || week === 4) return 3.5;
  const base = RIR_TABLE[week][role];
  return opts.conservative ? Math.min(4, base + 1) : base;
}

/** 2 → «2»; 1,5 → «1-2»; 0,5 → «0-1». */
export function fmtRir(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number.isInteger(n) ? String(n) : `${Math.floor(n)}-${Math.ceil(n)}`;
}

// ───────────── Plan de la sesión ─────────────

export interface PlanItem {
  exerciseId: string;
  nameEs: string;
  kind: ExerciseKind;
  equipment: string | null;
  role: ExerciseRole;
  /** Grupo muscular principal (para «primer básico de ese músculo»). */
  group: string | null;
  repMin: number;
  repMax: number;
  topSet: boolean;
  /** Series de trabajo ya calculadas por la doble progresión (peso y reps). */
  working: PlannedSet[];
  /** Última sesión al límite o por debajo del mínimo en un básico → más conservador. */
  conservative: boolean;
}

export interface PlanCtx {
  week: MesoWeek;
  deload: boolean;
  deficit: boolean;
  barKg: number;
  injuries: string | null;
  /** Técnicas (fallo/drop) ya usadas en la sesión (al añadir ejercicios a mitad). */
  techniquesUsed?: number;
}

export interface PlannedSetT extends PlannedSet {
  targetRir: number | null;
}

export interface PlannedExercise {
  sets: PlannedSetT[];
  note: string;
  technique: 'fallo' | 'drop' | null;
}

export function techniqueBudget(ctx: Pick<PlanCtx, 'week' | 'deload' | 'deficit'>): number {
  if (ctx.deload || ctx.week === 1 || ctx.week === 4) return 0;
  return ctx.deficit ? 1 : 2;
}

const DROP_EQUIPMENT = new Set(['machine', 'cable', 'dumbbell']);
const kg = (n: number | null) => (n == null ? '—' : `${fmtNum(n, 2)} kg`);

export function planSession(items: PlanItem[], ctx: PlanCtx): PlannedExercise[] {
  // 1) Qué ejercicios llevan técnica de intensidad (desde el final de la sesión).
  let budget = Math.max(0, techniqueBudget(ctx) - (ctx.techniquesUsed ?? 0));
  const technique = new Map<number, 'fallo' | 'drop'>();
  for (let i = items.length - 1; i >= 0 && budget > 0; i--) {
    const it = items[i];
    if (it.conservative || it.working.length < 2 || !allowsIntensityTechnique({ ...it, id: it.exerciseId }, it.role) || !isSafeForInjuries(it.nameEs, ctx.injuries)) continue;
    technique.set(i, DROP_EQUIPMENT.has(it.equipment ?? '') ? 'drop' : 'fallo');
    budget--;
  }

  const warmedGroups = new Set<string>();
  return items.map((it, i) => {
    const target = rirTarget(it.role, ctx.week, { deload: ctx.deload, conservative: it.conservative });
    const working: PlannedSetT[] = it.working.map((s) => ({ ...s, setType: 'normal', targetRir: target }));
    const topKg = working.reduce<number | null>((m, s) => (s.weightKg != null && (m == null || s.weightKg > m) ? s.weightKg : m), null);
    const lines: string[] = [];

    // Calentamiento: solo en el primer básico de cada músculo.
    let warm: PlannedSetT[] = [];
    const firstHeavy = it.role === 'basico' && (it.group == null || !warmedGroups.has(it.group));
    if (firstHeavy) {
      if (it.group) warmedGroups.add(it.group);
      const minKg = it.equipment === 'barbell' ? ctx.barKg : 0;
      const raw = warmupPlan(topKg, 3, { minKg, step: 2.5 });
      // Sin calentamientos repetidos al mismo peso ni iguales al de trabajo (pesos bajos).
      const seen = new Set<number>();
      for (const s of raw) {
        if (s.weightKg != null) {
          if (seen.has(s.weightKg) || (topKg != null && s.weightKg >= topKg)) continue;
          seen.add(s.weightKg);
        }
        warm.push({ ...s, targetRir: null });
      }
    }

    // Serie top + descargas (básicos).
    const useTop = it.role === 'basico' && it.topSet && !ctx.deload && working.length >= 2 && !it.conservative;
    if (useTop && topKg != null) {
      const back = Math.max(0, roundTo(topKg * 0.91, 2.5));
      working.forEach((s, j) => {
        if (j === 0) s.weightKg = topKg;
        else {
          s.setType = 'backoff';
          s.weightKg = back;
          s.targetRir = Math.min(4, target + 1);
        }
      });
    }

    // Técnica de intensidad en la última serie.
    const tech = technique.get(i) ?? null;
    const drops: PlannedSetT[] = [];
    if (tech) {
      const last = working[working.length - 1];
      last.targetRir = 0;
      if (tech === 'fallo') last.setType = 'fallo';
      else {
        const n = ctx.deficit ? 1 : 2;
        const w = last.weightKg;
        const factors = [0.78, 0.6].slice(0, n);
        for (const f of factors) drops.push({ setType: 'drop', weightKg: w != null ? Math.max(0, roundTo(w * f, 2.5)) : null, reps: last.reps, targetRir: 0 });
      }
    }

    // Explicación (2-3 líneas + qué hacer en cada serie).
    const range = `${working.length} × ${it.repMin}-${it.repMax}`;
    const why: Record<ExerciseRole, string> = {
      basico: `Básico pesado: ${range} a RIR ${fmtRir(target)}. Es fijo para medir tu fuerza; sin fallo ni dropset (riesgo y fatiga, más aún en déficit).`,
      accesorio: `Accesorio: ${range} a RIR ${fmtRir(target)}, mismo peso en todas las series para acumular volumen de calidad.`,
      aislamiento: `Aislamiento: ${range} a RIR ${fmtRir(target)}. Aquí es seguro apurar: poco riesgo y poca fatiga general.`,
    };
    lines.push(why[it.role]);
    if (ctx.deload) lines.push('Semana de descarga: la mitad de series, mismo peso y lejos del fallo.');
    else if (it.conservative) lines.push('Sesión conservadora: la última vez fuiste al límite o no llegaste al mínimo; deja más margen hoy.');
    if (warm.length)
      lines.push(
        warm.every((s) => s.weightKg != null)
          ? `Calentamiento (${warm.map((s) => kg(s.weightKg)).join(' / ')}) porque es el primer ejercicio pesado de este músculo.`
          : 'Calentamiento al 40/60/80 % del peso de trabajo porque es el primer ejercicio pesado de este músculo.',
      );
    else if (it.role === 'basico') lines.push('Sin calentamiento: este músculo ya está caliente por un básico anterior.');
    let n = 0;
    working.forEach((s) => {
      n++;
      if (s.setType === 'backoff') lines.push(`Serie ${n}: descarga a ${kg(s.weightKg)} (−9 %) a RIR ${fmtRir(s.targetRir)}.`);
      else if (useTop && n === 1) lines.push(`Serie 1: serie top a ${kg(s.weightKg)} a RIR ${fmtRir(s.targetRir)}.`);
    });
    if (tech === 'fallo') lines.push(`Serie ${working.length}: al fallo técnico, sin dropset en este ejercicio.`);
    else if (tech === 'drop') lines.push(`Serie ${working.length}: dropset → ${drops.map((d) => kg(d.weightKg)).join(' y ')} sin descanso, hasta el fallo técnico.`);
    else if (it.role !== 'basico' && !ctx.deload) {
      if (!allowsIntensityTechnique({ ...it, id: it.exerciseId }, it.role)) lines.push('Sin fallo ni dropset en este ejercicio.');
      else if (ctx.week === 1) lines.push('Semana 1 del mesociclo: sin fallo ni dropset (acumulación, RIR alto).');
      else lines.push(`Sin fallo/dropset hoy: máximo ${techniqueBudget(ctx)} por sesión${ctx.deficit ? ' en déficit' : ''} y se reservan para los últimos ejercicios.`);
    }

    return { sets: [...warm, ...working, ...drops], note: lines.join('\n'), technique: tech };
  });
}

/** ¿El RIR declarado o el resultado piden una sesión conservadora? (básicos) */
export function needsConservative(role: ExerciseRole, last: { hard: boolean; anyBelowMin: boolean } | null): boolean {
  return role === 'basico' && !!last && (last.hard || last.anyBelowMin);
}
