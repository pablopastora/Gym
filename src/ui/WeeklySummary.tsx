import { and, gte, isNotNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { cardioSession, workout, type Profile } from '@/db/schema';
import { currentTrend, measurementAt, weeklySummary } from '@/domain/body';
import { addDays, startOfWeek } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { evaluateGoal, onTrack } from '@/domain/goals';
import { weekStreak } from '@/domain/schedule';
import { useToday } from '@/hooks/useToday';
import { measurementsQuery, weightsQuery } from '@/repositories/body';

import { Banner, Card, Row, Stat } from './components';
import { colors } from './theme';

/** Resumen de la semana: entrenos, racha, cardio, peso medio, variación, cintura y ritmo. */
export function WeeklySummary({ profile }: { profile: Profile }) {
  // Fecha reactiva: si la app sigue abierta al cambiar de día o de semana, se recalcula.
  const today = useToday();
  const ws = startOfWeek(today);
  const { data: weights } = useLiveQuery(weightsQuery(db));
  const { data: measures } = useLiveQuery(measurementsQuery(db));
  const { data: workouts } = useLiveQuery(
    db.select({ date: workout.date }).from(workout).where(and(isNotNull(workout.endedAt), gte(workout.date, addDays(ws, -7 * 52)))),
    [ws],
  );
  const { data: cardio } = useLiveQuery(
    db.select({ min: cardioSession.durationMin, kcal: cardioSession.kcal }).from(cardioSession).where(gte(cardioSession.date, ws)),
    [ws],
  );
  const { data: weekKcal } = useLiveQuery(
    db.select({ kcal: workout.kcal }).from(workout).where(and(isNotNull(workout.endedAt), gte(workout.date, ws))),
    [ws],
  );
  if (!weights || !measures || !workouts || !cardio || !weekKcal) return null;
  const kcalWeek = weekKcal.reduce((a, w) => a + (w.kcal ?? 0), 0) + cardio.reduce((a, c) => a + (c.kcal ?? 0), 0);

  const dates = workouts.map((w) => w.date);
  const daysThisWeek = new Set(dates.filter((d) => d >= ws)).size;
  const streak = weekStreak(dates, today, profile.daysPerWeek, startOfWeek, addDays);
  const cardioMin = cardio.reduce((a, c) => a + c.min, 0);

  const week = weeklySummary(weights, today);
  const trend = currentTrend(weights, today) ?? weights.at(-1)?.weightKg ?? profile.startWeightKg;
  const goal = evaluateGoal({ currentKg: trend, goalKg: profile.goalWeightKg, goalDate: profile.goalDate, today });
  const track = onTrack(week.changeKg, goal.requiredKgPerWeek);
  const waistNow = measurementAt(measures, 'waistCm', today);
  const waistPrev = measurementAt(measures, 'waistCm', addDays(today, -28));

  return (
    <Card>
      <Row align="flex-start">
        <Stat label="Entrenos" value={`${daysThisWeek}/${profile.daysPerWeek}`} color={daysThisWeek >= profile.daysPerWeek ? colors.accentText : colors.text} />
        <Stat label="Racha" value={`${streak} sem.`} sub={streak ? 'cumpliendo tus días' : 'cumple la semana'} />
        <Stat label="Cardio" value={`${fmtNum(cardioMin, 0)} min`} />
      </Row>
      <Row align="flex-start">
        <Stat
          label="Peso medio"
          value={week.avgKg != null ? `${fmtNum(week.avgKg, 1)}` : '—'}
          sub={week.changeKg != null ? `${week.changeKg > 0 ? '+' : ''}${fmtNum(week.changeKg, 2)} kg vs. anterior` : 'Sin semana anterior'}
          color={week.changeKg != null && week.changeKg < 0 ? colors.accentText : colors.text}
        />
        <Stat
          label="Cintura"
          value={waistNow != null ? `${fmtNum(waistNow, 1)}` : '—'}
          sub={waistNow != null && waistPrev != null && waistPrev !== waistNow ? `${waistNow - waistPrev > 0 ? '+' : ''}${fmtNum(waistNow - waistPrev, 1)} cm en 4 sem.` : 'cm'}
          color={waistNow != null && waistPrev != null && waistNow < waistPrev ? colors.accentText : colors.text}
        />
        <Stat label="Kcal" value={`~${fmtNum(kcalWeek, 0)}`} sub="entreno + cardio (aprox.)" />
      </Row>
      {track === 'en_ritmo' && <Banner kind="ok">Vas en ritmo hacia tu objetivo.</Banner>}
      {track === 'por_detras' && (
        <Banner kind="warning">{`Esta semana vas por detrás del ritmo (necesitas −${fmtNum(goal.requiredKgPerWeek ?? 0, 2)} kg/sem).`}</Banner>
      )}
      {track === 'demasiado_rapido' && <Banner kind="warning">Estás bajando más rápido de lo previsto: vigila no perder fuerza.</Banner>}
      {track === 'sin_datos' && goal.status !== 'sin_objetivo' && week.entries === 0 ? (
        <Banner kind="info">Registra tu peso varios días para ver si vas en ritmo.</Banner>
      ) : null}
    </Card>
  );
}
