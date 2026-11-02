import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { desc, gte } from 'drizzle-orm';
import { router } from 'expo-router';

import { db } from '@/db/client';
import { bodyWeight, workout } from '@/db/schema';
import { bmi, bmiCategory, BMI_LABELS, currentTrend, weeklySummary } from '@/domain/body';
import { formatDateLong, startOfWeek, toISODate } from '@/domain/dates';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtNum } from '@/domain/format';
import { evaluateGoal, onTrack } from '@/domain/goals';
import { estimateSessionMinutes } from '@/domain/session';
import { useTodaySession } from '@/hooks/useTodaySession';
import { Banner, BigButton, Card, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Inicio() {
  const todayIso = toISODate();
  const { today, profile } = useTodaySession();
  const { data: weights } = useLiveQuery(
    db.select({ date: bodyWeight.date, weightKg: bodyWeight.weightKg }).from(bodyWeight).orderBy(desc(bodyWeight.date)).limit(60),
  );
  const { data: weekWorkouts } = useLiveQuery(
    db.select({ id: workout.id }).from(workout).where(gte(workout.date, startOfWeek(todayIso))),
  );

  if (!profile) return null;

  const trend = currentTrend(weights ?? [], todayIso);
  const currentKg = trend ?? weights?.[0]?.weightKg ?? profile.startWeightKg;
  const imc = bmi(currentKg, profile.heightCm);
  const goal = evaluateGoal({ currentKg, goalKg: profile.goalWeightKg, goalDate: profile.goalDate, today: todayIso });
  const week = weeklySummary(weights ?? [], todayIso);
  const track = onTrack(week.changeKg, goal.requiredKgPerWeek);

  const defaults = profile;
  const sessionExercises =
    today?.exercises.map((e) => ({
      sets: e.sets,
      warmupSets: e.warmupSets,
      restS: resolveRest(e.exercise.kind, defaults, e.exercise.defaultRestS, e.restS),
    })) ?? [];

  return (
    <Screen>
      <Txt variant="h1">{capitalize(formatDateLong(todayIso))}</Txt>

      <SectionTitle>Sesión de hoy</SectionTitle>
      {today ? (
        <Card>
          <Txt variant="h2">{today.name}</Txt>
          <Txt color={colors.textDim}>
            {today.exercises.length} ejercicios · ~{estimateSessionMinutes(sessionExercises)} min
          </Txt>
          <Txt variant="small" color={colors.textDim} numberOfLines={3}>
            {today.exercises.map((e) => e.exercise.nameEs).join(' · ')}
          </Txt>
          {today.cardioNote ? (
            <Txt variant="small" color={colors.warning}>
              {today.cardioNote}
            </Txt>
          ) : null}
          <BigButton title="Empezar entrenamiento" icon="play" onPress={() => router.push('/entrenar')} />
        </Card>
      ) : (
        <Card>
          <Txt color={colors.textDim}>No hay ninguna rutina activa. Actívala en la pestaña Rutinas.</Txt>
        </Card>
      )}

      <SectionTitle>Esta semana</SectionTitle>
      <Card>
        <Row align="flex-start">
          <Stat label="Entrenos" value={`${weekWorkouts?.length ?? 0}/${profile.daysPerWeek}`} />
          <Stat
            label="Peso medio"
            value={week.avgKg != null ? `${fmtNum(week.avgKg)} kg` : '—'}
            sub={week.changeKg != null ? `${week.changeKg > 0 ? '+' : ''}${fmtNum(week.changeKg, 2)} kg vs. anterior` : 'Sin datos de la semana anterior'}
            color={week.changeKg != null && week.changeKg < 0 ? colors.success : colors.text}
          />
        </Row>
        {track === 'en_ritmo' && <Banner kind="ok">Vas en ritmo hacia tu objetivo.</Banner>}
        {track === 'por_detras' && <Banner kind="warning">Esta semana vas por detrás del ritmo necesario.</Banner>}
        {track === 'demasiado_rapido' && (
          <Banner kind="warning">Estás bajando más rápido de lo previsto: vigila no perder fuerza.</Banner>
        )}
      </Card>

      <SectionTitle>Cuerpo</SectionTitle>
      <Card onPress={() => router.push('/ajustes/perfil')}>
        <Row align="flex-start">
          <Stat label={trend != null ? 'Tendencia (7 días)' : 'Peso'} value={`${fmtNum(currentKg)} kg`} />
          <Stat label="IMC" value={fmtNum(imc)} sub={BMI_LABELS[bmiCategory(imc)]} />
          <Stat
            label="Objetivo"
            value={profile.goalWeightKg != null ? `${fmtNum(profile.goalWeightKg)} kg` : '—'}
            sub={goal.kgToGo != null && goal.kgToGo > 0 ? `faltan ${fmtNum(goal.kgToGo)} kg` : undefined}
          />
        </Row>
        {goal.status === 'sin_objetivo' && <Banner kind="info">{goal.message}</Banner>}
        {(goal.status === 'agresivo' || goal.status === 'muy_agresivo') && (
          <Banner kind={goal.status === 'muy_agresivo' ? 'danger' : 'warning'}>{goal.message}</Banner>
        )}
      </Card>
    </Screen>
  );
}
