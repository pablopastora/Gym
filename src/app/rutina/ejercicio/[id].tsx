import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { db } from '@/db/client';
import type { Profile, RoutineExercise } from '@/db/schema';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { setExerciseRole } from '@/repositories/exercises';
import { deleteRoutineExercise, routineExerciseQuery, toggleRoutineSuperset, updateRoutineExercise } from '@/repositories/routines';
import { defaultRole, recommendedScheme, resolveRole, ROLE_LABELS } from '@/domain/setPlan';
import { pickExercise } from '@/stores/picker';
import { BigButton, Card, Chip, Field, Row, SectionTitle, Screen, Stepper, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

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
  const [form, setForm] = useState<Pick<RoutineExercise, 'sets' | 'repMin' | 'repMax' | 'warmupSets' | 'restS' | 'topSet'> & { notes: string }>({
    topSet: re.topSet,
    sets: re.sets,
    repMin: re.repMin,
    repMax: re.repMax,
    warmupSets: re.warmupSets,
    restS: re.restS,
    notes: re.notes ?? '',
  });
  const set = (p: Partial<typeof form>) => setForm({ ...form, ...p });
  const role = resolveRole(re.exercise);
  const scheme = recommendedScheme(role, profile.deficitMode);
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

      <SectionTitle>Rol en el plan automático</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label={`Automático (${ROLE_LABELS[defaultRole(re.exercise)].toLowerCase()})`} active={re.exercise.roleOverride == null} onPress={() => setExerciseRole(db, re.exerciseId, null)} />
        {(['basico', 'accesorio', 'aislamiento'] as const).map((r) => (
          <Chip key={r} label={ROLE_LABELS[r]} active={re.exercise.roleOverride === r} onPress={() => setExerciseRole(db, re.exerciseId, r)} />
        ))}
      </Row>
      <Txt variant="small" color={colors.textDim}>
        {`Esquema recomendado: ${scheme.sets} × ${scheme.repMin}-${scheme.repMax}. El rol decide calentamientos, RIR objetivo y si se permite fallo/dropset (nunca en básicos). Se aplica a todas las rutinas.`}
      </Txt>
      <BigButton
        title="Aplicar esquema recomendado"
        icon="auto-fix"
        kind="ghost"
        onPress={() => set({ sets: scheme.sets, repMin: scheme.repMin, repMax: scheme.repMax })}
      />
      {role === 'basico' ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="bodyBold">Serie top + series de descarga</Txt>
              <Txt variant="small" color={colors.textDim}>
                Una serie pesada y el resto un 9 % más ligeras. La progresión se mide en la serie top.
              </Txt>
            </View>
            <Switch value={form.topSet} onValueChange={(v) => set({ topSet: v })} trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.text} />
          </Row>
        </Card>
      ) : null}

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
        title={re.supersetGroup != null ? 'Quitar superserie' : 'Superserie con el siguiente'}
        icon="link-variant"
        kind="secondary"
        onPress={async () => {
          await toggleRoutineSuperset(db, re.id);
          router.back();
        }}
      />
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
          showAlert('Quitar ejercicio', `¿Quitar «${re.exercise.nameEs}» de ${re.day.name}?`, [
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
