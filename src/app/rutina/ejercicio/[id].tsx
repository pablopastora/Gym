import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { db } from '@/db/client';
import type { Profile, RoutineExercise } from '@/db/schema';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { deleteRoutineExercise, routineExerciseQuery, updateRoutineExercise } from '@/repositories/routines';
import { pickExercise } from '@/stores/picker';
import { BigButton, Chip, Field, Row, SectionTitle, Screen, Stepper, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const REST_PRESETS = [45, 60, 75, 90, 120, 150, 180, 240];

type Loaded = NonNullable<Awaited<ReturnType<typeof routineExerciseQuery>>>;

export default function EditorEjercicioRutina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const { data } = useAsyncQuery(`routine-ex-${id}`, () => routineExerciseQuery(db, Number(id)));
  if (!data || !profile) return null;
  return <Editor key={`${data.id}-${data.exerciseId}`} re={data} profile={profile} />;
}

function Editor({ re, profile }: { re: Loaded; profile: Profile }) {
  const [form, setForm] = useState<Pick<RoutineExercise, 'sets' | 'repMin' | 'repMax' | 'warmupSets' | 'restS'> & { notes: string }>({
    sets: re.sets,
    repMin: re.repMin,
    repMax: re.repMax,
    warmupSets: re.warmupSets,
    restS: re.restS,
    notes: re.notes ?? '',
  });
  const set = (p: Partial<typeof form>) => setForm({ ...form, ...p });
  const defaultRest = resolveRest(re.exercise.kind, profile, re.exercise.defaultRestS);

  const save = async () => {
    await updateRoutineExercise(db, re.id, { ...form, notes: form.notes.trim() || null });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <View>
        <Txt variant="h1">{re.exercise.nameEs}</Txt>
        <Txt color={colors.textDim}>{re.day.name}</Txt>
      </View>

      <SectionTitle>Series y repeticiones</SectionTitle>
      <Stepper label="Series" value={form.sets} min={1} max={10} onChange={(v) => set({ sets: v })} />
      <Stepper
        label="Reps mínimo"
        value={form.repMin}
        min={1}
        max={50}
        onChange={(v) => set({ repMin: v, repMax: Math.max(v, form.repMax) })}
      />
      <Stepper
        label="Reps máximo"
        value={form.repMax}
        min={1}
        max={50}
        onChange={(v) => set({ repMax: v, repMin: Math.min(v, form.repMin) })}
      />
      <Txt variant="small" color={colors.textDim}>
        Doble progresión: cuando completes todas las series en {form.repMax} reps, la app subirá la carga y volverás a {form.repMin}.
      </Txt>
      <Stepper label="Calentamientos" value={form.warmupSets} min={0} max={4} onChange={(v) => set({ warmupSets: v })} />

      <SectionTitle>Descanso</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label={`Por defecto (${fmtRest(defaultRest)})`} active={form.restS == null} onPress={() => set({ restS: null })} />
        {REST_PRESETS.map((s) => (
          <Chip key={s} label={fmtRest(s)} active={form.restS === s} onPress={() => set({ restS: s })} />
        ))}
      </Row>

      <Field label="Nota de técnica o ajuste" value={form.notes} onChangeText={(v) => set({ notes: v })} multiline placeholder="Ej.: asiento en posición 4, agarre neutro" />

      <BigButton title="Guardar" icon="content-save" onPress={save} />
      <BigButton
        title="Sustituir ejercicio"
        icon="swap-horizontal"
        kind="secondary"
        onPress={() => pickExercise((exerciseId) => updateRoutineExercise(db, re.id, { exerciseId }))}
      />
      <BigButton
        title="Quitar de la rutina"
        icon="delete-outline"
        kind="ghost"
        onPress={() =>
          Alert.alert('Quitar ejercicio', `¿Quitar «${re.exercise.nameEs}» de ${re.day.name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Quitar',
              style: 'destructive',
              onPress: async () => {
                await deleteRoutineExercise(db, re.id);
                router.back();
              },
            },
          ])
        }
      />
    </Screen>
  );
}
