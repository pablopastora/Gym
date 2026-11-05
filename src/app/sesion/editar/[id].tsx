import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View, KeyboardAvoidingView } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { getPreviousBests } from '@/repositories/progress';
import {
  addExerciseToWorkout,
  completeSet,
  getLastPerformance,
  saveWorkoutEdits,
  substituteWorkoutExercise,
  uncompleteSet,
  workoutDetailQuery,
  type WorkoutDetail,
} from '@/repositories/workouts';
import { pickExercise } from '@/stores/picker';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Txt } from '@/ui/components';
import { ExerciseCard } from '@/ui/session/ExerciseCard';
import type { SetValues } from '@/ui/session/SetRow';
import { colors, space } from '@/ui/theme';

/**
 * Edición de un entreno ya terminado: peso, reps, RIR, tipo de serie, notas,
 * añadir/quitar series y ejercicios. Los cambios se guardan al instante; al salir
 * se descartan las series sin completar y se recalculan las kcal. Récords y
 * progresión se recalculan solos porque se derivan del historial.
 */
export default function EditarEntreno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const profile = useProfile();
  const { data: w } = useAsyncQuery(`edit-${id}`, () => workoutDetailQuery(db, workoutId));
  const exerciseKey = w?.exercises.map((e) => e.exerciseId).join(',') ?? '';
  const { data: extra } = useAsyncQuery(
    `edit-extra-${id}-${exerciseKey}`,
    async () => {
      if (!w) return null;
      const ids = [...new Set(w.exercises.map((e) => e.exerciseId))];
      const last = Object.fromEntries(await Promise.all(ids.map(async (x) => [x, await getLastPerformance(db, x, w.id)] as const)));
      return { last, bests: await getPreviousBests(db, ids, w.id) };
    },
    { live: false },
  );

  // Al salir de la pantalla: limpiar y recalcular kcal.
  useEffect(() => () => void saveWorkoutEdits(db, workoutId).catch(() => {}), [workoutId]);

  if (!w || !profile) return null;

  const onToggleSet = async (_we: WorkoutDetail['exercises'][number], setId: number, wasCompleted: boolean, v: SetValues) => {
    if (wasCompleted) {
      await uncompleteSet(db, setId);
      return;
    }
    if (v.reps == null || v.reps <= 0) {
      showAlert('Faltan repeticiones', 'Introduce las repeticiones de la serie.');
      return;
    }
    await completeSet(db, setId, v, w.endedAt ?? Date.now());
  };

  const save = async () => {
    const n = await saveWorkoutEdits(db, workoutId);
    if (n === 0) showAlert('Entreno vacío', 'No queda ninguna serie completada. Puedes borrarlo desde el resumen.');
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: 'Editar entreno',
          headerRight: () => (
            <Pressable
              onPress={save}
              accessibilityRole="button"
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.accentPressed : colors.accent, paddingHorizontal: space.lg, height: 40, borderRadius: 8, justifyContent: 'center' })}>
              <Txt variant="button" color={colors.onAccent}>
                Guardar
              </Txt>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: space.xs }}>
            <Txt variant="h1">{w.name}</Txt>
            <Txt variant="small" color={colors.textDim}>
              {formatDateLong(w.date)}
            </Txt>
          </View>
          <Banner kind="info">
            Los cambios se guardan al momento. Las series sin ✓ se descartan al guardar. Récords, progresión y kcal se recalculan.
          </Banner>
          {w.exercises.map((we, i) => (
            <ExerciseCard
              key={we.id}
              we={we}
              workoutId={w.id}
              last={extra?.last[we.exerciseId]}
              bests={extra?.bests[we.exerciseId]}
              effort={profile.effortMetric}
              isFirst={i === 0}
              isLast={i === w.exercises.length - 1}
              onToggleSet={onToggleSet}
              onSubstitute={(weId) => pickExercise((exerciseId) => substituteWorkoutExercise(db, weId, exerciseId, profile))}
              bar={{ barKg: profile.barKg, plates: profile.availablePlates }}
            />
          ))}
          <BigButton title="Añadir ejercicio" icon="plus" kind="secondary" onPress={() => pickExercise((exerciseId) => addExerciseToWorkout(db, w.id, exerciseId, profile))} />
          <BigButton title="Guardar cambios" icon="content-save" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
