import { eq } from 'drizzle-orm';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/data/labels';
import { db } from '@/db/client';
import { exercise, type Exercise, type ExerciseKind } from '@/db/schema';
import { fmtRest } from '@/domain/session';
import { useAsyncQuery } from '@/hooks/useDb';
import { createCustomExercise, updateCustomExercise, validateCustomExercise, type CustomExerciseInput } from '@/repositories/exercises';
import { customPhotoUri } from '@/services/exerciseMedia';
import { deleteAppFile, saveToAppDir } from '@/services/files';
import { pickPhoto, type PhotoSource } from '@/services/photos';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Chip, Field, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const REST_PRESETS = [45, 60, 75, 90, 120, 150, 180];
const KINDS: { value: ExerciseKind; label: string }[] = [
  { value: 'compuesto', label: 'Básico' },
  { value: 'accesorio', label: 'Accesorio' },
  { value: 'abs', label: 'Abdominal' },
  { value: 'cardio', label: 'Cardio' },
];

export default function EditarEjercicio() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useAsyncQuery(`custom-${id ?? 'nuevo'}`, async () =>
    id ? ((await db.select().from(exercise).where(eq(exercise.id, id)))[0] ?? null) : null,
  );
  if (id && data === undefined) return null;
  return <Form key={id ?? 'nuevo'} existing={data ?? null} />;
}

function Form({ existing }: { existing: Exercise | null }) {
  const [f, setF] = useState<CustomExerciseInput>(() => ({
    nameEs: existing?.nameEs ?? '',
    primaryMuscles: existing?.primaryMuscles ?? [],
    secondaryMuscles: existing?.secondaryMuscles ?? [],
    equipment: existing?.equipment ?? null,
    kind: existing?.kind ?? 'accesorio',
    defaultRestS: existing?.defaultRestS ?? null,
    techniqueNote: existing?.techniqueNote ?? '',
    instructions: existing?.instructions ?? [],
    customPhotoFile: existing?.customPhotoFile ?? null,
  }));
  const [steps, setSteps] = useState((existing?.instructions ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<CustomExerciseInput>) => setF({ ...f, ...p });
  const toggle = (list: string[], m: string) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  const input = { ...f, instructions: steps.split('\n') };
  const error = validateCustomExercise(input);

  const addPhoto = async (src: PhotoSource) => {
    const uri = await pickPhoto(src, [1, 1]);
    if (!uri) return;
    const name = await saveToAppDir(uri, 'exercise-photos', 'ejercicio');
    if (f.customPhotoFile && f.customPhotoFile !== existing?.customPhotoFile) deleteAppFile('exercise-photos', f.customPhotoFile);
    set({ customPhotoFile: name });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (existing) {
        await updateCustomExercise(db, existing.id, input);
        if (existing.customPhotoFile && existing.customPhotoFile !== f.customPhotoFile) deleteAppFile('exercise-photos', existing.customPhotoFile);
      } else {
        await createCustomExercise(db, input);
      }
      router.back();
    } catch (e) {
      showAlert('No se pudo guardar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Editar ejercicio' : 'Nuevo ejercicio' }} />

      <SectionTitle>Foto (opcional)</SectionTitle>
      {f.customPhotoFile ? (
        <Image
          source={customPhotoUri(f.customPhotoFile)}
          contentFit="cover"
          style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surface2 }}
        />
      ) : null}
      <Row>
        <BigButton title="Cámara" icon="camera" kind="secondary" style={{ flex: 1 }} onPress={() => addPhoto('camara')} />
        <BigButton title="Galería" icon="image-multiple" kind="secondary" style={{ flex: 1 }} onPress={() => addPhoto('galeria')} />
      </Row>
      {f.customPhotoFile ? <BigButton title="Quitar foto" kind="ghost" onPress={() => set({ customPhotoFile: null })} /> : null}

      <Field label="Nombre" value={f.nameEs} onChangeText={(v) => set({ nameEs: v })} placeholder="Ej.: Press en máquina convergente" />

      <SectionTitle>Tipo</SectionTitle>
      <Segmented options={KINDS} value={f.kind} onChange={(v) => set({ kind: v })} />

      <SectionTitle>Músculos principales</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {Object.entries(MUSCLE_LABELS).map(([k, label]) => (
          <Chip key={k} label={label} active={f.primaryMuscles.includes(k)} onPress={() => set({ primaryMuscles: toggle(f.primaryMuscles, k) })} />
        ))}
      </Row>

      <SectionTitle>Músculos secundarios</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {Object.entries(MUSCLE_LABELS)
          .filter(([k]) => !f.primaryMuscles.includes(k))
          .map(([k, label]) => (
            <Chip key={k} label={label} active={f.secondaryMuscles.includes(k)} onPress={() => set({ secondaryMuscles: toggle(f.secondaryMuscles, k) })} />
          ))}
      </Row>

      <SectionTitle>Equipamiento</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label="Ninguno" active={f.equipment == null} onPress={() => set({ equipment: null })} />
        {Object.entries(EQUIPMENT_LABELS).map(([k, label]) => (
          <Chip key={k} label={label} active={f.equipment === k} onPress={() => set({ equipment: k })} />
        ))}
      </Row>

      <SectionTitle>Descanso</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label="Según el tipo" active={f.defaultRestS == null} onPress={() => set({ defaultRestS: null })} />
        {REST_PRESETS.map((s) => (
          <Chip key={s} label={fmtRest(s)} active={f.defaultRestS === s} onPress={() => set({ defaultRestS: s })} />
        ))}
      </Row>

      <Field label="Nota de técnica o ajuste (opcional)" value={f.techniqueNote ?? ''} onChangeText={(v) => set({ techniqueNote: v })} multiline />
      <Field label="Instrucciones (un paso por línea, opcional)" value={steps} onChangeText={setSteps} multiline />

      {error ? <Banner kind="info">{error}</Banner> : null}
      <View style={{ gap: space.md }}>
        <BigButton title="Guardar" icon="content-save" disabled={!!error} loading={busy} onPress={save} />
        <Txt variant="caption" color={colors.textFaint}>
          La foto se guarda solo dentro de la app.
        </Txt>
      </View>
    </Screen>
  );
}
