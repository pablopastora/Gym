import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { summarizeSets } from '@/domain/workout';
import { useAsyncQuery } from '@/hooks/useDb';
import { useNow } from '@/hooks/useNow';
import { useWeekPlan } from '@/hooks/useWeekPlan';
import { deleteCardio, recentCardioQuery } from '@/repositories/cardio';
import { getActiveWorkout, recentWorkoutsQuery } from '@/repositories/workouts';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { BigButton, Card, EmptyState, ListRow, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';
import { PlanDayCard } from '@/ui/PlanDayCard';
import { startSession } from '@/ui/sessionStart';

export default function Entrenar() {
  const { plan, routine, profile } = useWeekPlan();
  const { data: active } = useAsyncQuery('active-workout-summary', () => getActiveWorkout(db));
  const { data: history } = useAsyncQuery('recent-workouts', () => recentWorkoutsQuery(db, 15));
  const { data: cardio } = useLiveQuery(recentCardioQuery(db, 10));
  const [another, setAnother] = useState(false);
  const now = useNow(30_000);

  const start = (dayId: number | 'libre') => profile && startSession(profile, dayId);
  const advance = (dayId: number, name: string, label: string) =>
    showAlert('Adelantar sesión', `¿Hacer hoy «${name}» (prevista para ${label.toLowerCase()})? El resto de la semana se recalcula.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Adelantar', onPress: () => start(dayId) },
    ]);

  const anotherActions: SheetAction[] = [
    ...(plan?.nextSessionNow ? [{ label: `Siguiente sesión: ${plan.nextSessionNow.name}`, icon: 'play' as const, onPress: () => start(plan.nextSessionNow!.id) }] : []),
    { label: 'Entreno libre', icon: 'plus' as const, onPress: () => start('libre') },
  ];

  return (
    <Screen>
      {active ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Txt variant="label" color={colors.accentText}>
            Sesión en curso
          </Txt>
          <Txt variant="h2">{active.name}</Txt>
          <Txt color={colors.textDim}>{`Empezada hace ${fmtDuration(Math.max(0, now - active.startedAt) / 1000)}`}</Txt>
          <BigButton title="Continuar" icon="play" onPress={() => router.push('/sesion')} />
        </Card>
      ) : null}

      {routine && plan && profile ? (
        <>
          <SectionTitle right={<Txt variant="caption" color={colors.textFaint}>{routine.name}</Txt>}>Tu semana</SectionTitle>
          {plan.days.map((d) => (
            <PlanDayCard
              key={d.date}
              entry={d}
              profile={profile}
              onStart={active ? undefined : () => d.session && start(d.session.id)}
              onAdvance={active || !d.session ? undefined : () => advance(d.session!.id, d.session!.name, d.label)}
            />
          ))}
          {plan.todayEntry.status === 'completado' && !active ? (
            <BigButton title="Empezar otra sesión hoy" icon="plus" kind="secondary" onPress={() => setAnother(true)} />
          ) : null}
        </>
      ) : (
        <EmptyState icon="clipboard-list-outline" title="Sin rutina activa" text="Activa o crea una rutina en la pestaña Rutinas." />
      )}

      <Row>
        <BigButton title="Entreno libre" icon="plus" kind="ghost" style={{ flex: 1 }} disabled={!!active} onPress={() => start('libre')} />
        <BigButton title="Cardio" icon="run" kind="ghost" style={{ flex: 1 }} onPress={() => router.push('/cardio/nuevo')} />
      </Row>

      <SectionTitle>Historial</SectionTitle>
      {history?.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {history.map((w) => {
            const s = summarizeSets(w.exercises.flatMap((e) => e.sets));
            return (
              <ListRow
                key={w.id}
                icon="dumbbell"
                title={w.name}
                subtitle={`${formatDateLong(w.date)} · ${fmtDuration(((w.endedAt ?? w.startedAt) - w.startedAt) / 1000)} · ${s.workingSets} series · ${fmtNum(s.volumeKg, 0)} kg`}
                onPress={() => router.push({ pathname: '/sesion/resumen/[id]', params: { id: w.id } })}
              />
            );
          })}
        </View>
      ) : (
        <Txt color={colors.textDim}>Aún no has terminado ningún entreno.</Txt>
      )}

      {cardio?.length ? (
        <>
          <SectionTitle>Cardio</SectionTitle>
          <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
            {cardio.map((c) => (
              <ListRow
                key={c.id}
                icon="run"
                title={`${c.type} · ${fmtNum(c.durationMin, 0)} min`}
                subtitle={[
                  formatDateLong(c.date),
                  c.distanceKm != null ? `${fmtNum(c.distanceKm, 2)} km` : null,
                  c.steps != null ? `${c.steps.toLocaleString('es-ES')} pasos` : null,
                  c.kcal != null ? `~${fmtNum(c.kcal, 0)} kcal` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() =>
                  showAlert('Borrar cardio', '¿Borrar este registro de cardio?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar', style: 'destructive', onPress: () => deleteCardio(db, c.id) },
                  ])
                }
              />
            ))}
          </View>
        </>
      ) : null}
      <View style={{ height: space.lg }} />
      <ActionSheet visible={another} title="Otra sesión hoy" actions={anotherActions} onClose={() => setAnother(false)} />
    </Screen>
  );
}
