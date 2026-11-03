import { and, asc, desc, eq, gte, inArray, isNotNull, lt, ne } from 'drizzle-orm';

import { appMeta, exercise, profile, routineExercise, routineSuggestion, workout, workoutExercise, workoutSet } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { generateSuggestions, type LibEx } from '@/domain/adapt';
import { addDays, startOfWeek } from '@/domain/dates';
import type { HistSession } from '@/domain/progression';
import { resolveTrainingWeekdays } from '@/domain/weekPlan';

import { addRoutineExercise, getActiveRoutineId, routineWithDaysQuery } from './routines';

const META_KEY = 'adapt_week';

async function getMeta(db: AppDb, key: string) {
  const [r] = await db.select().from(appMeta).where(eq(appMeta.key, key));
  return r?.value;
}

async function setMeta(db: AppDb, key: string, value: string) {
  await db.insert(appMeta).values({ key, value }).onConflictDoUpdate({ target: appMeta.key, set: { value } });
}

/** Historial reciente de todos los ejercicios (sin descargas), agrupado por ejercicio. */
async function recentHistory(db: AppDb, from: string) {
  const rows = await db
    .select({
      exerciseId: workoutExercise.exerciseId,
      workoutId: workout.id,
      date: workout.date,
      weightKg: workoutSet.weightKg,
      reps: workoutSet.reps,
      rir: workoutSet.rir,
      rpe: workoutSet.rpe,
      setType: workoutSet.setType,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(
      and(
        isNotNull(workout.endedAt),
        eq(workout.isDeload, false),
        gte(workout.date, from),
        eq(workoutSet.completed, true),
        ne(workoutSet.setType, 'calentamiento'),
      ),
    )
    .orderBy(asc(workout.startedAt), asc(workoutSet.sortOrder));
  const map = new Map<string, (HistSession & { workoutId: number })[]>();
  for (const r of rows) {
    const list = map.get(r.exerciseId) ?? [];
    let s = list.find((x) => x.workoutId === r.workoutId);
    if (!s) {
      s = { workoutId: r.workoutId, date: r.date, sets: [] };
      list.push(s);
    }
    s.sets.push({ weightKg: r.weightKg, reps: r.reps, rir: r.rir, rpe: r.rpe, setType: r.setType });
    map.set(r.exerciseId, list);
  }
  return map;
}

/**
 * Genera las sugerencias de la semana si aún no se han generado (una vez por
 * semana, la primera vez que se abre la app). Devuelve cuántas se crearon.
 */
export async function ensureWeeklySuggestions(db: AppDb, today: string, nowMs = Date.now()): Promise<number> {
  const ws = startOfWeek(today);
  if ((await getMeta(db, META_KEY)) === ws) return 0;

  // Las pendientes de semanas anteriores caducan (no cuentan como rechazadas).
  await db
    .update(routineSuggestion)
    .set({ status: 'caducada', decidedAt: nowMs })
    .where(and(eq(routineSuggestion.status, 'pendiente'), lt(routineSuggestion.weekStart, ws)));

  const routineId = await getActiveRoutineId(db);
  const [p] = await db.select().from(profile).limit(1);
  const routine = routineId != null ? await routineWithDaysQuery(db, routineId) : null;
  let created = 0;
  if (routine && p) {
    const libRows = await db
      .select({ id: exercise.id, nameEs: exercise.nameEs, primaryMuscles: exercise.primaryMuscles, equipment: exercise.equipment, kind: exercise.kind, category: exercise.category, curated: exercise.curated })
      .from(exercise);
    const library = new Map<string, LibEx>(libRows.map((r) => [r.id, r]));
    const from = addDays(ws, -42);
    const history = await recentHistory(db, from);
    const dates = await db
      .select({ date: workout.date })
      .from(workout)
      .where(and(isNotNull(workout.endedAt), eq(workout.isDeload, false), gte(workout.date, from)));
    const past = await db.select().from(routineSuggestion).where(gte(routineSuggestion.weekStart, addDays(ws, -63)));
    const suggestions = generateSuggestions({
      today,
      nowMs,
      days: routine.days.map((d) => ({
        id: d.id,
        name: d.name,
        isOptional: d.isOptional,
        exercises: d.exercises.map((e) => ({ id: e.id, exerciseId: e.exerciseId, sets: e.sets, repMin: e.repMin, repMax: e.repMax })),
      })),
      trainingDaysPerWeek: resolveTrainingWeekdays(p).length,
      library,
      history,
      workoutDates: dates.map((d) => d.date),
      deficitMode: p.deficitMode,
      injuries: p.injuries,
      past,
    });
    for (const s of suggestions) {
      await db.insert(routineSuggestion).values({ ...s, weekStart: ws, routineId: routine.id });
      created++;
    }
  }
  await setMeta(db, META_KEY, ws);
  return created;
}

export function pendingSuggestionsQuery(db: AppDb) {
  return db.select().from(routineSuggestion).where(eq(routineSuggestion.status, 'pendiente')).orderBy(asc(routineSuggestion.id));
}

export function suggestionHistoryQuery(db: AppDb) {
  return db
    .select()
    .from(routineSuggestion)
    .where(inArray(routineSuggestion.status, ['aceptada', 'rechazada', 'caducada']))
    .orderBy(desc(routineSuggestion.decidedAt), desc(routineSuggestion.id));
}

async function nameOf(db: AppDb, id: string | null) {
  if (!id) return '—';
  const [e] = await db.select({ n: exercise.nameEs }).from(exercise).where(eq(exercise.id, id));
  return e?.n ?? id;
}

/**
 * Acepta y aplica la sugerencia a la rutina (próximas sesiones). Si la rutina
 * ha cambiado y ya no aplica, la marca como caducada y devuelve false.
 */
export async function acceptSuggestion(db: AppDb, id: number, nowMs = Date.now()): Promise<boolean> {
  const [s] = await db.select().from(routineSuggestion).where(eq(routineSuggestion.id, id));
  if (!s || s.status !== 'pendiente') return false;
  const expire = async () => {
    await db.update(routineSuggestion).set({ status: 'caducada', decidedAt: nowMs }).where(eq(routineSuggestion.id, id));
    return false;
  };
  let summary: string;
  if (s.action === 'anadir') {
    if (!s.routineDayId || !s.suggestedExerciseId) return expire();
    await addRoutineExercise(db, s.routineDayId, s.suggestedExerciseId);
    summary = `Añadido «${await nameOf(db, s.suggestedExerciseId)}» a la rutina.`;
  } else {
    if (!s.routineExerciseId) return expire();
    const [re] = await db.select().from(routineExercise).where(eq(routineExercise.id, s.routineExerciseId));
    if (!re || re.exerciseId !== s.exerciseId) return expire();
    if (s.action === 'sustituir') {
      if (!s.suggestedExerciseId) return expire();
      const [next] = await db.select({ kind: exercise.kind }).from(exercise).where(eq(exercise.id, s.suggestedExerciseId));
      await db
        .update(routineExercise)
        .set({ exerciseId: s.suggestedExerciseId, warmupSets: next?.kind === 'compuesto' ? Math.max(re.warmupSets, 1) : 0 })
        .where(eq(routineExercise.id, re.id));
      summary = `«${await nameOf(db, s.exerciseId)}» → «${await nameOf(db, s.suggestedExerciseId)}».`;
    } else {
      const delta = s.setsDelta ?? 1;
      await db.update(routineExercise).set({ sets: re.sets + delta }).where(eq(routineExercise.id, re.id));
      summary = `«${await nameOf(db, s.exerciseId)}»: ${re.sets} → ${re.sets + delta} series.`;
    }
  }
  await db.update(routineSuggestion).set({ status: 'aceptada', decidedAt: nowMs, appliedSummary: summary }).where(eq(routineSuggestion.id, id));
  return true;
}

/** Rechaza: no se volverá a proponer lo mismo en 4 semanas. */
export async function rejectSuggestion(db: AppDb, id: number, nowMs = Date.now()) {
  await db.update(routineSuggestion).set({ status: 'rechazada', decidedAt: nowMs }).where(eq(routineSuggestion.id, id));
}
