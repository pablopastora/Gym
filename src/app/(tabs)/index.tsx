import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { bmi, bmiCategory, BMI_LABELS, currentTrend } from '@/domain/body';
import { formatDateLong, toISODate } from '@/domain/dates';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtNum } from '@/domain/format';
import { evaluateGoal } from '@/domain/goals';
import { estimateSessionMinutes } from '@/domain/session';
import { useAsyncQuery } from '@/hooks/useDb';
import { useTodaySession } from '@/hooks/useTodaySession';
import { weightsQuery } from '@/repositories/body';
import { getActiveWorkout, startWorkoutFromDay } from '@/repositories/workouts';
import { ensureNotificationPermission } from '@/services/notifications';
import { Banner, BigButton, Card, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { DeloadCard } from '@/ui/DeloadCard';
import { QuickWeight } from '@/ui/QuickWeight';
import { WeeklySummary } from '@/ui/WeeklySummary';
import { colors } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Inicio() {
  const todayIso = toISODate();
  const { today, profile } = useTodaySession();
  const { data: active } = useAsyncQuery('active-workout-home', () => getActiveWorkout(db));
  const [starting, setStarting] = useState(false);
  const { data: weights } = useLiveQuery(weightsQuery(db));

  if (!profile) return null;

  const startToday = async () => {
    if (!today) return;
    setStarting(true);
    try {
      await ensureNotificationPermission();
      await startWorkoutFromDay(db, today.id, profile);
      router.push('/sesion');
    } catch (e) {
      showAlert('No se pudo empezar', (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const trend = currentTrend(weights ?? [], todayIso);
  const currentKg = trend ?? weights?.at(-1)?.weightKg ?? profile.startWeightKg;
  const imc = bmi(currentKg, profile.heightCm);
  const goal = evaluateGoal({ currentKg, goalKg: profile.goalWeightKg, goalDate: profile.goalDate, today: todayIso });

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

      <QuickWeight />

      <SectionTitle>Sesión de hoy</SectionTitle>
      {active ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Txt variant="label" color={colors.accentText}>
            Sesión en curso
          </Txt>
          <Txt variant="h2">{active.name}</Txt>
          <BigButton title="Continuar" icon="play" onPress={() => router.push('/sesion')} />
        </Card>
      ) : today ? (
        <Card>
          <Txt variant="h1">{today.name}</Txt>
          <Txt color={colors.textDim}>
            {today.exercises.length} ejercicios · ~{estimateSessionMinutes(sessionExercises)} min
          </Txt>
          <Txt variant="small" color={colors.textDim} numberOfLines={3}>
            {today.exercises.map((e) => e.exercise.nameEs).join(' · ')}
          </Txt>
          {today.cardioNote ? (
            <Txt variant="small" color={colors.textDim}>
              {today.cardioNote}
            </Txt>
          ) : null}
          <BigButton title="Empezar entrenamiento" icon="play" loading={starting} onPress={startToday} />
        </Card>
      ) : (
        <Card>
          <Txt color={colors.textDim}>No hay ninguna rutina activa. Actívala en la pestaña Rutinas.</Txt>
        </Card>
      )}

      <DeloadCard />

      <SectionTitle>Esta semana</SectionTitle>
      <WeeklySummary profile={profile} />

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
