import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { setBeatsRecord, sessionBests } from '@/domain/records';
import { afterSetInSuperset } from '@/domain/supersets';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { useNow } from '@/hooks/useNow';
import { useScreenAwake } from '@/hooks/useScreenAwake';
import {
  addExerciseToWorkout,
  completeSet,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  getLastPerformance,
  substituteWorkoutExercise,
  uncompleteSet,
  WARMUP_REST_S,
  workoutDetailQuery,
  type WorkoutDetail,
} from '@/repositories/workouts';
import { getPreviousBests } from '@/repositories/progress';
import { pickExercise } from '@/stores/picker';
import { useRestTimer } from '@/stores/restTimer';
import { BigButton, EmptyState, Icon, Screen, Txt } from '@/ui/components';
import { ExerciseCard } from '@/ui/session/ExerciseCard';
import { RestTimerBar } from '@/ui/session/RestTimerBar';
import type { SetValues } from '@/ui/session/SetRow';
import { colors, radius, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

function Stopwatch({ startedAt }: { startedAt: number }) {
  const now = useNow(1000);
  return <Txt variant="display">{fmtDuration((now - startedAt) / 1000)}</Txt>;
}

/** Texto de la siguiente serie pendiente (para la notificación de fin de descanso). */
function nextSetLabel(w: WorkoutDetail, afterSetId: number): string {
  const flat = w.exercises.flatMap((we) => we.sets.map((s) => ({ we, s })));
  const idx = flat.findIndex((x) => x.s.id === afterSetId);
  const next = flat.slice(idx + 1).find((x) => !x.s.completed) ?? flat.find((x) => !x.s.completed && x.s.id !== afterSetId);
  if (!next) return '';
  const kg = next.s.weightKg != null ? `${fmtNum(next.s.weightKg, 2)} kg` : '';
  const reps = next.s.reps != null ? `× ${next.s.reps}` : '';
  return `${next.we.exercise.nameEs} ${kg} ${reps}`.trim();
}

export default function Sesion() {
  useScreenAwake();
  const profile = useProfile();
  const startRest = useRestTimer((s) => s.start);
  const skipRest = useRestTimer((s) => s.skip);

  const { data: w } = useAsyncQuery('active-workout', async () => {
    const active = await getActiveWorkout(db);
    return active ? ((await workoutDetailQuery(db, active.id)) ?? null) : null;
  });
  const exerciseKey = w?.exercises.map((e) => e.exerciseId).join(',') ?? '';
  const { data: lastMap } = useAsyncQuery(
    `last-${w?.id}-${exerciseKey}`,
    async () => {
      if (!w) return {};
      const entries = await Promise.all(
        [...new Set(w.exercises.map((e) => e.exerciseId))].map(async (id) => [id, await getLastPerformance(db, id, w.id)] as const),
      );
      return Object.fromEntries(entries);
    },
    { live: false },
  );
  const { data: bestsMap } = useAsyncQuery(
    `bests-${w?.id}-${exerciseKey}`,
    async (): Promise<Awaited<ReturnType<typeof getPreviousBests>>> =>
      w ? getPreviousBests(db, [...new Set(w.exercises.map((e) => e.exerciseId))], w.id) : {},
    { live: false },
  );
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (w === undefined || !profile) return null;
  if (w === null) {
    return (
      <Screen>
        <EmptyState icon="dumbbell" title="No hay ninguna sesión en curso" text="Empieza una desde la pestaña Entrenar." />
        <BigButton title="Volver" onPress={() => router.back()} kind="secondary" />
      </Screen>
    );
  }

  const onToggleSet = async (we: WorkoutDetail['exercises'][number], setId: number, wasCompleted: boolean, v: SetValues) => {
    if (wasCompleted) {
      await uncompleteSet(db, setId);
      return;
    }
    if (v.reps == null || v.reps <= 0) {
      showAlert('Faltan repeticiones', 'Introduce las repeticiones de la serie antes de completarla.');
      return;
    }
    const s0 = we.sets.find((x) => x.id === setId);
    const prev = bestsMap?.[we.exerciseId];
    const before = sessionBests(we.sets.filter((x) => x.completed && x.id !== setId));
    const ref = prev
      ? {
          maxWeight: Math.max(prev.maxWeight ?? 0, before.maxWeight ?? 0) || null,
          bestE1rm: Math.max(prev.bestE1rm ?? 0, before.bestE1rm ?? 0) || null,
        }
      : null;
    const beaten = s0?.setType === 'calentamiento' ? [] : setBeatsRecord(v, ref);
    if (beaten.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast(
        `¡Nuevo récord! ${we.exercise.nameEs}: ${v.weightKg != null ? `${fmtNum(v.weightKg, 2)} kg × ` : '× '}${v.reps}` +
          (beaten.includes('peso_max') ? ' (peso máximo)' : ' (mejor 1RM estimado)'),
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await completeSet(db, setId, v);
    const s = we.sets.find((x) => x.id === setId);
    const fresh = (await workoutDetailQuery(db, w.id)) ?? w;
    const freshWe = fresh.exercises.find((e) => e.id === we.id) ?? we;
    // Dropset: las caídas van seguidas, sin descanso.
    const idx = freshWe.sets.findIndex((x) => x.id === setId);
    const nextInExercise = freshWe.sets.slice(idx + 1).find((x) => !x.completed);
    if (nextInExercise?.setType === 'drop') {
      setToast(`Dropset: baja a ${nextInExercise.weightKg != null ? `${fmtNum(nextInExercise.weightKg, 2)} kg` : 'menos peso'} sin descansar`);
      return;
    }
    // Superserie: pasar al siguiente ejercicio del grupo; el descanso llega al cerrar la ronda.
    if (s?.setType !== 'calentamiento') {
      const decision = afterSetInSuperset(
        fresh.exercises.map((e) => ({ id: e.id, name: e.exercise.nameEs, supersetGroup: e.supersetGroup, restS: e.restS, sets: e.sets })),
        we.id,
        setId,
      );
      if (decision.kind === 'siguiente') {
        setToast(`Superserie: ahora ${decision.label}`);
        return;
      }
      if (we.supersetGroup != null) {
        startRest(decision.restS ?? we.restS ?? profile.restAccessoryS, nextSetLabel(fresh, setId));
        return;
      }
    }
    const rest = s?.setType === 'calentamiento' ? Math.min(WARMUP_REST_S, we.restS ?? WARMUP_REST_S) : (we.restS ?? profile.restAccessoryS);
    startRest(rest, nextSetLabel(fresh, setId));
  };

  const onSubstitute = (weId: number) =>
    pickExercise((exerciseId) => substituteWorkoutExercise(db, weId, exerciseId, profile));

  const onAddExercise = () => pickExercise((exerciseId) => addExerciseToWorkout(db, w.id, exerciseId, profile));

  const allSets = w.exercises.flatMap((e) => e.sets);
  const completed = allSets.filter((s) => s.completed).length;

  const doFinish = async () => {
    skipRest();
    await finishWorkout(db, w.id);
    router.replace({ pathname: '/sesion/resumen/[id]', params: { id: w.id, nuevo: '1' } });
  };

  const onFinish = () => {
    if (completed === 0) {
      showAlert('Sin series completadas', 'No has completado ninguna serie. ¿Quieres descartar el entreno?', [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onDiscardConfirmed },
      ]);
      return;
    }
    const pending = allSets.length - completed;
    showAlert(
      'Terminar entreno',
      pending > 0 ? `Hay ${pending} series sin completar; no se guardarán.` : '¡Buen trabajo! ¿Guardar el entreno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Terminar', onPress: doFinish },
      ],
    );
  };

  const onDiscardConfirmed = async () => {
    skipRest();
    await discardWorkout(db, w.id);
    router.back();
  };

  const onDiscard = () =>
    showAlert('Descartar entreno', 'Se borrará esta sesión y todas sus series. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onDiscardConfirmed },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          headerTitle: () => <Stopwatch startedAt={w.startedAt} />,
          headerRight: () => (
            <Pressable
              onPress={onFinish}
              accessibilityRole="button"
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.accentPressed : colors.accent,
                paddingHorizontal: space.lg,
                height: 40,
                borderRadius: 8,
                justifyContent: 'center',
              })}>
              <Txt variant="button" color={colors.onAccent}>
                Terminar
              </Txt>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: space.xs }}>
            <Txt variant="h1">{w.name}</Txt>
            <Txt variant="small" color={colors.textDim}>
              {`${formatDateLong(w.date)} · ${completed}/${allSets.length} series`}
            </Txt>
          </View>
          {w.exercises.map((we, i) => (
            <ExerciseCard
              key={we.id}
              we={we}
              workoutId={w.id}
              last={lastMap?.[we.exerciseId]}
              bests={bestsMap?.[we.exerciseId]}
              effort={profile.effortMetric}
              isFirst={i === 0}
              isLast={i === w.exercises.length - 1}
              onToggleSet={onToggleSet}
              onSubstitute={onSubstitute}
              bar={{ barKg: profile.barKg, plates: profile.availablePlates }}
            />
          ))}
          <BigButton title="Añadir ejercicio" icon="plus" kind="secondary" onPress={onAddExercise} />
          <BigButton
            title="Registrar cardio"
            icon="run"
            kind="ghost"
            onPress={() => router.push({ pathname: '/cardio/nuevo', params: { workoutId: w.id } })}
          />
          <BigButton title="Descartar entreno" icon="delete-outline" kind="ghost" onPress={onDiscard} />
        </ScrollView>
      </KeyboardAvoidingView>
      {toast ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="assertive"
          style={{
            position: 'absolute',
            top: space.sm,
            left: space.md,
            right: space.md,
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            padding: space.md,
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
          }}>
          <Icon name={toast.startsWith('¡Nuevo récord') ? 'trophy' : toast.startsWith('Superserie') ? 'link-variant' : 'arrow-down-bold'} color={colors.onAccent} />
          <Txt variant="bodyBold" color={colors.onAccent} style={{ flex: 1 }}>
            {toast}
          </Txt>
        </View>
      ) : null}
      <RestTimerBar />
    </View>
  );
}
