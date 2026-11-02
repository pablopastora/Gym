import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { exerciseImageUrl, youtubeSearchUrl } from '@/data/library';
import { CATEGORY_LABELS, equipmentLabel, KIND_LABELS, muscleLabel } from '@/data/labels';
import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { useProfile } from '@/hooks/useDb';
import { Banner, BigButton, Card, Chip, IconButton, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

export default function EjercicioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const { data } = useLiveQuery(db.select().from(exercise).where(eq(exercise.id, id)), [id]);
  const ex = data?.[0];
  if (!ex || !profile) return null;

  const toggleFav = () => db.update(exercise).set({ isFavorite: !ex.isFavorite }).where(eq(exercise.id, ex.id)).run();
  const rest = resolveRest(ex.kind, profile, ex.defaultRestS);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              name={ex.isFavorite ? 'star' : 'star-outline'}
              color={ex.isFavorite ? colors.warning : colors.text}
              label={ex.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              onPress={toggleFav}
            />
          ),
        }}
      />
      <View style={{ gap: 4 }}>
        <Txt variant="h1">{ex.nameEs}</Txt>
        {ex.nameEn && ex.nameEn !== ex.nameEs ? <Txt color={colors.textFaint}>{ex.nameEn}</Txt> : null}
      </View>

      {ex.images.length ? (
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

      <BigButton
        title="Ver técnica en YouTube"
        icon="youtube"
        kind="secondary"
        onPress={() => Linking.openURL(ex.videoUrl ?? youtubeSearchUrl(ex.nameEs))}
      />

      <Card>
        <Txt variant="caption" color={colors.textDim}>
          MÚSCULOS PRINCIPALES
        </Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {ex.primaryMuscles.map((m) => (
            <Chip key={m} label={muscleLabel(m)} active />
          ))}
        </Row>
        {ex.secondaryMuscles.length ? (
          <>
            <Txt variant="caption" color={colors.textDim}>
              SECUNDARIOS
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

      <SectionTitle>Instrucciones</SectionTitle>
      {!ex.curated ? (
        <Txt variant="small" color={colors.textFaint}>
          Ficha aún sin traducir (texto original de free-exercise-db).
        </Txt>
      ) : null}
      <Card>
        {ex.instructions.map((step, i) => (
          <Row key={i} gap={space.md} style={{ alignItems: 'flex-start' }}>
            <Txt variant="bodyBold" color={colors.primary}>
              {i + 1}
            </Txt>
            <Txt style={{ flex: 1 }}>{step}</Txt>
          </Row>
        ))}
      </Card>

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
    </Screen>
  );
}
