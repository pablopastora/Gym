import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { bmi, bmiCategory, BMI_LABELS, currentTrend } from '@/domain/body';
import { formatDateLong } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { evaluateGoal } from '@/domain/goals';
import { useAsyncQuery } from '@/hooks/useDb';
import { useWeekPlan } from '@/hooks/useWeekPlan';
import { weightsQuery } from '@/repositories/body';
import { getActiveWorkout, workoutsOnDateQuery } from '@/repositories/workouts';
import { MESO_WEEK_LABELS } from '@/domain/setPlan';
import { useMesoWeek } from '@/hooks/useMesoWeek';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { MoveDaySheet } from '@/ui/MoveDaySheet';
import { Banner, BigButton, Card, Icon, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { SessionPreview, sessionMinutes } from '@/ui/PlanDayCard';
import { startSession } from '@/ui/sessionStart';
import { WeeklySuggestions } from '@/ui/WeeklySuggestions';
import { DeloadCard } from '@/ui/DeloadCard';
import { QuickWeight } from '@/ui/QuickWeight';
import { TodayActivity } from '@/ui/TodayActivity';
import { WeeklySummary } from '@/ui/WeeklySummary';
import { colors, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Inicio() {
  const { plan, profile, today: todayIso, hasOverrides } = useWeekPlan();
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const meso = useMesoWeek(profile, todayIso);
  const { data: active } = useAsyncQuery('active-workout-home', () => getActiveWorkout(db));
  const { data: weights } = useLiveQuery(weightsQuery(db));
  const { data: doneToday } = useLiveQuery(workoutsOnDateQuery(db, todayIso), [todayIso]);
  const [another, setAnother] = useState(false);

  if (!profile) return null;

  const start = (dayId: number | 'libre') => startSession(profile, dayId);
  const trend = currentTrend(weights ?? [], todayIso);
  const currentKg = trend ?? weights?.at(-1)?.weightKg ?? profile.startWeightKg;
  const imc = bmi(currentKg, profile.heightCm);
  const goal = evaluateGoal({ currentKg, goalKg: profile.goalWeightKg, goalDate: profile.goalDate, today: todayIso });

  const todayEntry = plan?.todayEntry;
  const next = plan?.next && !plan.next.isToday ? plan.next : null;
  const lastToday = doneToday?.at(-1);
  const anotherActions: SheetAction[] = [
    ...(plan?.nextSessionNow ? [{ label: `Siguiente sesión: ${plan.nextSessionNow.name}`, icon: 'play' as const, onPress: () => start(plan.nextSessionNow!.id) }] : []),
    { label: 'Entreno libre', icon: 'plus' as const, onPress: () => start('libre') },
  ];

  return (
    <Screen>
      <Txt variant="h1">{capitalize(formatDateLong(todayIso))}</Txt>

      <QuickWeight />

      <SectionTitle>Hoy</SectionTitle>
      {active ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Txt variant="label" color={colors.accentText}>
            Sesión en curso
          </Txt>
          <Txt variant="h2">{active.name}</Txt>
          <BigButton title="Continuar" icon="play" onPress={() => router.push('/sesion')} />
        </Card>
      ) : !plan?.days.length && !doneToday?.length ? (
        <Card>
          <Txt color={colors.textDim}>No hay ninguna rutina activa. Actívala en la pestaña Rutinas.</Txt>
        </Card>
      ) : doneToday?.length ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Row gap={space.sm}>
            <Icon name="check-circle" color={colors.accentText} size={28} />
            <Txt variant="h2" style={{ flex: 1 }}>
              Entrenamiento de hoy completado
            </Txt>
          </Row>
          {doneToday.map((w) => (
            <Txt key={w.id} color={colors.textDim}>
              {`${w.name}${w.kcal ? ` · ~${fmtNum(w.kcal, 0)} kcal` : ''}`}
            </Txt>
          ))}
          <Row gap={space.sm}>
            <BigButton
              title="Ver resumen"
              icon="text-box-check-outline"
              style={{ flex: 1, paddingHorizontal: space.sm }}
              onPress={() => lastToday && router.push({ pathname: '/sesion/resumen/[id]', params: { id: lastToday.id } })}
            />
            <BigButton
              title="Editar"
              icon="pencil-outline"
              kind="secondary"
              style={{ flex: 1, paddingHorizontal: space.sm }}
              onPress={() => lastToday && router.push({ pathname: '/sesion/editar/[id]', params: { id: lastToday.id } })}
            />
          </Row>
          <BigButton title="Empezar otra sesión" icon="plus" kind="ghost" onPress={() => setAnother(true)} />
        </Card>
      ) : todayEntry?.status === 'pendiente' && todayEntry.session ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Txt variant="label" color={colors.accentText}>
            Toca hoy
          </Txt>
          <Txt variant="h1">{todayEntry.session.name}</Txt>
          <Txt color={colors.textDim}>{`${todayEntry.session.exercises.length} ejercicios · ~${sessionMinutes(todayEntry.session, profile)} min`}</Txt>
          {meso ? (
            <Txt variant="caption" color={colors.textFaint}>
              {`Plan automático · ${MESO_WEEK_LABELS[meso]}`}
            </Txt>
          ) : null}
          <SessionPreview day={todayEntry.session} profile={profile} />
          <BigButton title="Empezar entrenamiento" icon="play" onPress={() => start(todayEntry.session!.id)} />
          <BigButton title="Hoy no puedo · mover" icon="calendar-arrow-right" kind="ghost" onPress={() => setMoveFrom(todayIso)} />
        </Card>
      ) : (
        <Card>
          <Row gap={space.sm}>
            <Icon name="sleep" color={colors.textDim} />
            <Txt variant="h2">Hoy toca descanso</Txt>
          </Row>
          <Txt variant="small" color={colors.textDim}>
            Recuperar también es entrenar. Si quieres, puedes adelantar la siguiente sesión.
          </Txt>
        </Card>
      )}

      <TodayActivity today={todayIso} />

      {next?.session && !active ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={colors.textDim}>
                {`Siguiente · ${next.label}`}
              </Txt>
              <Txt variant="h3">{next.session.name}</Txt>
            </View>
            <Pressable onPress={() => router.push('/entrenar')} hitSlop={8}>
              <Txt variant="caption" color={colors.textDim}>
                Ver la semana ›
              </Txt>
            </Pressable>
          </Row>
          <Txt variant="small" color={colors.textDim} numberOfLines={2}>
            {next.session.exercises.map((e) => `${e.exercise.nameEs} ${e.sets}×${e.repMin}-${e.repMax}`).join(' · ')}
          </Txt>
          <BigButton
            title="Adelantar a hoy"
            icon="fast-forward"
            kind="ghost"
            onPress={() =>
              showAlert('Adelantar sesión', `¿Hacer hoy «${next.session!.name}» (prevista para ${next.label.toLowerCase()})?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Adelantar', onPress: () => start(next.session!.id) },
              ])
            }
          />
        </Card>
      ) : null}

      <WeeklySuggestions today={todayIso} />

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
      <ActionSheet visible={another} title="Otra sesión hoy" actions={anotherActions} onClose={() => setAnother(false)} />
      <MoveDaySheet plan={plan} from={moveFrom} hasOverrides={!!hasOverrides} onClose={() => setMoveFrom(null)} />
    </Screen>
  );
}
