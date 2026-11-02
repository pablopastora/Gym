import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { summarizeSets } from '@/domain/workout';
import { useAsyncQuery } from '@/hooks/useDb';
import { useNow } from '@/hooks/useNow';
import { useTodaySession } from '@/hooks/useTodaySession';
import { deleteCardio, recentCardioQuery } from '@/repositories/cardio';
import { getActiveWorkout, recentWorkoutsQuery, startEmptyWorkout, startWorkoutFromDay } from '@/repositories/workouts';
import { ensureNotificationPermission } from '@/services/notifications';
import { BigButton, Card, EmptyState, ListRow, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

export default function Entrenar() {
  const { routine, today, profile } = useTodaySession();
  const { data: active } = useAsyncQuery('active-workout-summary', () => getActiveWorkout(db));
  const { data: history } = useAsyncQuery('recent-workouts', () => recentWorkoutsQuery(db, 15));
  const { data: cardio } = useLiveQuery(recentCardioQuery(db, 10));
  const [starting, setStarting] = useState<number | 'libre' | null>(null);
  const now = useNow(30_000);

  const start = async (dayId: number | 'libre') => {
    if (!profile) return;
    if (active) {
      router.push('/sesion');
      return;
    }
    setStarting(dayId);
    try {
      await ensureNotificationPermission();
      if (dayId === 'libre') await startEmptyWorkout(db);
      else await startWorkoutFromDay(db, dayId, profile);
      router.push('/sesion');
    } catch (e) {
      Alert.alert('No se pudo empezar', (e as Error).message);
    } finally {
      setStarting(null);
    }
  };

  const days = routine?.days.filter((d) => (profile?.daysPerWeek ?? 4) >= 5 || !d.isOptional) ?? [];

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

      {routine ? (
        <>
          <SectionTitle>{routine.name}</SectionTitle>
          {days.map((d) => {
            const isToday = today?.id === d.id;
            return (
              <Card key={d.id} style={isToday ? { borderColor: colors.accent, borderWidth: 1 } : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="h3" style={{ flex: 1 }}>
                    {d.name}
                  </Txt>
                  {isToday ? (
                    <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm }}>
                      <Txt variant="label" color={colors.onAccent}>
                        Toca hoy
                      </Txt>
                    </View>
                  ) : null}
                </Row>
                <Txt variant="small" color={colors.textDim} numberOfLines={2}>
                  {d.exercises.map((e) => e.exercise.nameEs).join(' · ') || 'Sin ejercicios'}
                </Txt>
                <BigButton
                  title={active ? 'Hay una sesión en curso' : 'Empezar'}
                  icon="play"
                  kind={isToday ? 'primary' : 'secondary'}
                  disabled={!!active || d.exercises.length === 0}
                  loading={starting === d.id}
                  onPress={() => start(d.id)}
                />
              </Card>
            );
          })}
        </>
      ) : (
        <EmptyState icon="clipboard-list-outline" title="Sin rutina activa" text="Activa o crea una rutina en la pestaña Rutinas." />
      )}

      <Row>
        <BigButton title="Entreno libre" icon="plus" kind="ghost" style={{ flex: 1 }} disabled={!!active} loading={starting === 'libre'} onPress={() => start('libre')} />
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
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() =>
                  Alert.alert('Borrar cardio', '¿Borrar este registro de cardio?', [
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
    </Screen>
  );
}
