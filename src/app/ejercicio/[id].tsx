import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { exerciseImageUrl, youtubeSearchUrl } from '@/data/library';
import { CATEGORY_LABELS, equipmentLabel, KIND_LABELS, muscleLabel } from '@/data/labels';
import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { shouldLookup } from '@/domain/wger';
import { useProfile } from '@/hooks/useDb';
import { deleteCustomExercise, exerciseUsage, setFavorite } from '@/repositories/exercises';
import { customPhotoUri } from '@/services/exerciseMedia';
import { deleteAppFile } from '@/services/files';
import { lookupAndStoreVideo } from '@/services/wger';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, Chip, IconButton, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { ExerciseVideo } from '@/ui/ExerciseVideo';
import { colors, radius, space } from '@/ui/theme';

export default function EjercicioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const { data } = useLiveQuery(db.select().from(exercise).where(eq(exercise.id, id)), [id]);
  const ex = data?.[0];
  const [openedAt] = useState(() => Date.now());
  const [lookupDone, setLookupDone] = useState(false);
  const needsVideo = !!ex && shouldLookup(ex, openedAt);

  // Primera visita: buscar vídeo de técnica en wger (desde el móvil) y guardarlo.
  useEffect(() => {
    if (!ex || !needsVideo || !ex.nameEn) return;
    let alive = true;
    lookupAndStoreVideo(ex.id, ex.nameEn).finally(() => {
      if (alive) setLookupDone(true);
    });
    return () => {
      alive = false;
    };
  }, [ex?.id, ex?.nameEn, needsVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ex || !profile) return null;

  const toggleFav = () => setFavorite(db, ex.id, !ex.isFavorite);
  const rest = resolveRest(ex.kind, profile, ex.defaultRestS);

  const onDelete = async () => {
    const u = await exerciseUsage(db, ex.id);
    if (u.routines || u.workouts) {
      showAlert(
        'No se puede borrar',
        `Este ejercicio está en ${u.routines} ${u.routines === 1 ? 'rutina' : 'rutinas'} y en ${u.workouts} ${u.workouts === 1 ? 'entreno' : 'entrenos'} del historial. Quítalo de las rutinas; el historial se conserva.`,
      );
      return;
    }
    showAlert('Borrar ejercicio', `¿Borrar «${ex.nameEs}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (await deleteCustomExercise(db, ex.id)) {
            deleteAppFile('exercise-photos', ex.customPhotoFile);
            router.back();
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Row gap={0}>
              {ex.isCustom ? (
                <IconButton
                  name="pencil-outline"
                  label="Editar ejercicio"
                  onPress={() => router.push({ pathname: '/ejercicio/editar', params: { id: ex.id } })}
                />
              ) : null}
              <IconButton
                name={ex.isFavorite ? 'star' : 'star-outline'}
                color={ex.isFavorite ? colors.accentText : colors.text}
                label={ex.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                onPress={toggleFav}
              />
            </Row>
          ),
        }}
      />
      <View style={{ gap: 4 }}>
        <Txt variant="h1">{ex.nameEs}</Txt>
        {ex.nameEn && ex.nameEn !== ex.nameEs ? <Txt color={colors.textFaint}>{ex.nameEn}</Txt> : null}
      </View>

      {ex.customPhotoFile ? (
        <Image
          source={customPhotoUri(ex.customPhotoFile)}
          contentFit="cover"
          style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surface2 }}
        />
      ) : ex.images.length ? (
        <Row gap={space.sm}>
          {ex.images.slice(0, 2).map((img) => (
            <Image
              key={img}
              source={exerciseImageUrl(img)}
              cachePolicy="disk"
              contentFit="cover"
              transition={200}
              style={{ flex: 1, aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surface2 }}
            />
          ))}
        </Row>
      ) : null}

      {ex.videoUrl ? (
        <ExerciseVideo uri={ex.videoUrl} attribution={ex.videoAttribution} />
      ) : needsVideo && !lookupDone ? (
        <Txt variant="small" color={colors.textFaint}>
          Buscando vídeo de técnica en wger…
        </Txt>
      ) : null}

      <BigButton
        title="Mi historial y gráficas"
        icon="chart-line"
        onPress={() => router.push({ pathname: '/ejercicio/historial/[id]', params: { id: ex.id } })}
      />
      <BigButton
        title={ex.videoUrl ? 'Más vídeos en YouTube' : 'Ver técnica en YouTube'}
        icon="youtube"
        kind="secondary"
        onPress={() => Linking.openURL(youtubeSearchUrl(ex.nameEs))}
      />

      <Card>
        <Txt variant="label" color={colors.textDim}>
          Músculos principales
        </Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {ex.primaryMuscles.map((m) => (
            <Chip key={m} label={muscleLabel(m)} active />
          ))}
        </Row>
        {ex.secondaryMuscles.length ? (
          <>
            <Txt variant="label" color={colors.textDim}>
              Secundarios
            </Txt>
            <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
              {ex.secondaryMuscles.map((m) => (
                <Chip key={m} label={muscleLabel(m)} />
              ))}
            </Row>
          </>
        ) : null}
        <Txt color={colors.textDim}>
          {equipmentLabel(ex.equipment)} · {KIND_LABELS[ex.kind]} · {CATEGORY_LABELS[ex.category] ?? ex.category} ·
          descanso {fmtRest(rest)}
        </Txt>
      </Card>

      {ex.techniqueNote ? <Banner kind="info">{ex.techniqueNote}</Banner> : null}

      {ex.instructions.length ? (
        <>
          <SectionTitle>Instrucciones</SectionTitle>
          {!ex.curated ? (
            <Txt variant="small" color={colors.textFaint}>
              Ficha aún sin traducir (texto original de free-exercise-db).
            </Txt>
          ) : null}
          <Card>
            {ex.instructions.map((step, i) => (
              <Row key={i} gap={space.md} style={{ alignItems: 'flex-start' }}>
                <Txt variant="bodyBold" color={colors.accentText}>
                  {i + 1}
                </Txt>
                <Txt style={{ flex: 1 }}>{step}</Txt>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {ex.commonErrors.length ? (
        <>
          <SectionTitle>Errores comunes</SectionTitle>
          <Card>
            {ex.commonErrors.map((err, i) => (
              <Row key={i} gap={space.md} style={{ alignItems: 'flex-start' }}>
                <Txt color={colors.danger}>✕</Txt>
                <Txt style={{ flex: 1 }}>{err}</Txt>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {ex.mediaAttribution ? (
        <Txt variant="caption" color={colors.textFaint}>
          {ex.mediaAttribution}
        </Txt>
      ) : null}

      {ex.isCustom ? <BigButton title="Borrar ejercicio" icon="delete-outline" kind="ghost" onPress={onDelete} /> : null}
    </Screen>
  );
}
