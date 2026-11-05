import { and, asc, desc, eq, gte, isNotNull, ne } from 'drizzle-orm';

import { exercise, profile, workout, workoutExercise, workoutSet, type Profile } from '@/db/schema';
import { weeklyMuscleMap } from '@/domain/muscleMap';
import { mesoWeek } from '@/domain/setPlan';
import type { AppDb } from '@/db/types';
import { addDays, diffDays } from '@/domain/dates';
import { deloadStatus, stallCount, type HistSession, type ProgressionConfig } from '@/domain/progression';
import { computeRecords, sessionBests, type RecSession } from '@/domain/records';

/** Historial cronológico de series de trabajo completadas de un ejercicio (sin descargas). */
export async function getExerciseHistory(
  db: AppDb,
  exerciseId: string,
  { excludeWorkoutId, includeDeload = false }: { excludeWorkoutId?: number; includeDeload?: boolean } = {},
): Promise<(HistSession & { workoutId: number })[]> {
  const conds = [
    eq(workoutExercise.exerciseId, exerciseId),
    isNotNull(workout.endedAt),
    eq(workoutSet.completed, true),
    ne(workoutSet.setType, 'calentamiento'),
  ];
  if (excludeWorkoutId != null) conds.push(ne(workout.id, excludeWorkoutId));
  if (!includeDeload) conds.push(eq(workout.isDeload, false));
  const rows = await db
    .select({
      workoutId: workout.id,
      date: workout.date,
      startedAt: workout.startedAt,
      weightKg: workoutSet.weightKg,
      reps: workoutSet.reps,
      rir: workoutSet.rir,
      rpe: workoutSet.rpe,
      setType: workoutSet.setType,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(...conds))
    .orderBy(asc(workout.startedAt), asc(workoutExercise.id), asc(workoutSet.sortOrder));
  const out: (HistSession & { workoutId: number })[] = [];
  for (const r of rows) {
    let cur = out.at(-1);
    if (!cur || cur.workoutId !== r.workoutId) {
      cur = { workoutId: r.workoutId, date: r.date, sets: [] };
      out.push(cur);
    }
    cur.sets.push({ weightKg: r.weightKg, reps: r.reps, rir: r.rir, rpe: r.rpe, setType: r.setType });
  }
  return out;
}

/** Sesiones (con descargas incluidas) agrupadas por ejercicio, para récords. */
export async function allSessionsByExercise(db: AppDb, exerciseId?: string): Promise<Map<string, RecSession[]>> {
  const conds = [isNotNull(workout.endedAt), eq(workoutSet.completed, true)];
  if (exerciseId) conds.push(eq(workoutExercise.exerciseId, exerciseId));
  const rows = await db
    .select({
      exerciseId: workoutExercise.exerciseId,
      workoutId: workout.id,
      date: workout.date,
      weightKg: workoutSet.weightKg,
      reps: workoutSet.reps,
      setType: workoutSet.setType,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(...conds))
    .orderBy(asc(workout.startedAt));
  const map = new Map<string, RecSession[]>();
  for (const r of rows) {
    const list = map.get(r.exerciseId) ?? [];
    let s = list.find((x) => x.workoutId === r.workoutId);
    if (!s) {
      s = { workoutId: r.workoutId, date: r.date, sets: [] };
      list.push(s);
    }
    s.sets.push({ weightKg: r.weightKg, reps: r.reps, setType: r.setType });
    map.set(r.exerciseId, list);
  }
  return map;
}

/** Mejores marcas previas (para el aviso de récord en directo). */
export async function getPreviousBests(db: AppDb, exerciseIds: string[], excludeWorkoutId: number) {
  const out: Record<string, { maxWeight: number | null; bestE1rm: number | null }> = {};
  const map = await allSessionsByExercise(db);
  for (const id of exerciseIds) {
    const sets = (map.get(id) ?? []).filter((s) => s.workoutId !== excludeWorkoutId).flatMap((s) => s.sets);
    const b = sessionBests(sets);
    out[id] = { maxWeight: b.maxWeight, bestE1rm: b.bestE1rm };
  }
  return out;
}

export interface RecordRow {
  exerciseId: string;
  nameEs: string;
  sessions: number;
  records: ReturnType<typeof computeRecords>['records'];
  lastDate: string;
}

export async function getAllRecords(db: AppDb): Promise<RecordRow[]> {
  const map = await allSessionsByExercise(db);
  if (!map.size) return [];
  const names = await db.select({ id: exercise.id, nameEs: exercise.nameEs }).from(exercise);
  const nameOf = new Map(names.map((n) => [n.id, n.nameEs]));
  const rows: RecordRow[] = [];
  for (const [id, sessions] of map) {
    const { records, history } = computeRecords(sessions);
    if (!history.length) continue;
    rows.push({ exerciseId: id, nameEs: nameOf.get(id) ?? id, sessions: history.length, records, lastDate: history.at(-1)!.date });
  }
  return rows.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.nameEs.localeCompare(b.nameEs, 'es'));
}

/** Récords batidos en una sesión concreta, por ejercicio. */
export async function recordsInWorkout(db: AppDb, workoutId: number) {
  const ids = await db
    .selectDistinct({ id: workoutExercise.exerciseId })
    .from(workoutExercise)
    .where(eq(workoutExercise.workoutId, workoutId));
  const out: { exerciseId: string; types: ReturnType<typeof computeRecords>['history'][number]['records'] }[] = [];
  for (const { id } of ids) {
    const map = await allSessionsByExercise(db, id);
    const { history } = computeRecords(map.get(id) ?? []);
    const point = history.find((h) => h.workoutId === workoutId);
    if (point?.records.length) out.push({ exerciseId: id, types: point.records });
  }
  return out;
}

// ───────────── Descarga ─────────────

export async function getDeloadStatus(db: AppDb, p: Profile, today: string) {
  const [first] = await db
    .select({ date: workout.date })
    .from(workout)
    .where(isNotNull(workout.endedAt))
    .orderBy(asc(workout.startedAt))
    .limit(1);
  const sinceDate = p.lastDeloadDate ?? first?.date ?? null;

  // Ejercicios entrenados en los últimos 14 días y cuántos llevan 2+ sesiones sin progresar.
  const recent = await db
    .selectDistinct({ exerciseId: workoutExercise.exerciseId })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(isNotNull(workout.endedAt), gte(workout.date, addDays(today, -14)), eq(workout.isDeload, false)));
  let stalled = 0;
  for (const { exerciseId } of recent) {
    const [cfgRow] = await db
      .select({ repMin: workoutExercise.repMin, repMax: workoutExercise.repMax })
      .from(workoutExercise)
      .where(eq(workoutExercise.exerciseId, exerciseId))
      .orderBy(desc(workoutExercise.id))
      .limit(1);
    const hist = await getExerciseHistory(db, exerciseId);
    const cfg: ProgressionConfig = {
      sets: 1,
      repMin: cfgRow?.repMin ?? 8,
      repMax: cfgRow?.repMax ?? 12,
      region: 'superior',
      incUpper: p.incrementUpperKg,
      incLower: p.incrementLowerKg,
      deficitMode: p.deficitMode,
    };
    if (stallCount(hist.slice(-4), cfg) >= 2) stalled++;
  }

  const rirRows = await db
    .select({ rir: workoutSet.rir })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(
      and(
        isNotNull(workout.endedAt),
        gte(workout.date, addDays(today, -6)),
        eq(workoutSet.completed, true),
        ne(workoutSet.setType, 'calentamiento'),
        isNotNull(workoutSet.rir),
      ),
    );
  const avgRir = rirRows.length >= 6 ? rirRows.reduce((a, r) => a + (r.rir ?? 0), 0) / rirRows.length : null;

  const meso = p.autoSetPlan ? mesoWeek(today, { lastDeloadDate: p.lastDeloadDate, mesoStart: p.mesoStart, firstWorkoutDate: first?.date ?? null }) : null;
  return deloadStatus(
    {
      mesoWeek: meso,
      today,
      sinceDate,
      deloadUntil: p.deloadUntil,
      snoozeUntil: p.deloadSnoozeUntil,
      stalledRatio: recent.length ? stalled / recent.length : 0,
      stalledExercises: stalled,
      avgRirLastWeek: avgRir,
    },
    diffDays,
  );
}

export async function startDeload(db: AppDb, today: string) {
  await db
    .update(profile)
    .set({ deloadUntil: addDays(today, 6), lastDeloadDate: today, deloadSnoozeUntil: null })
    .where(eq(profile.id, 1));
}

export async function endDeload(db: AppDb) {
  await db.update(profile).set({ deloadUntil: null }).where(eq(profile.id, 1));
}

export async function snoozeDeload(db: AppDb, today: string, days = 7) {
  await db.update(profile).set({ deloadSnoozeUntil: addDays(today, days) }).where(eq(profile.id, 1));
}

/** Series de trabajo completadas por grupo muscular desde `from` (mapa muscular semanal). */
export async function muscleMapSince(db: AppDb, from: string) {
  const rows = await db
    .select({ primary: exercise.primaryMuscles, secondary: exercise.secondaryMuscles, setType: workoutSet.setType })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(and(gte(workout.date, from), eq(workoutSet.completed, true), ne(workoutSet.setType, 'calentamiento')));
  return weeklyMuscleMap(rows.map((r) => ({ primaryMuscles: r.primary, secondaryMuscles: r.secondary, sets: 1 })));
}
