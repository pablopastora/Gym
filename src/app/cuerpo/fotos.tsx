import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { groupPhotosByDate, PHOTO_VIEWS, trendAt, type PhotoView } from '@/domain/body';
import { formatDateLong, isValidISODate, toISODate } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { photosQuery, weightsQuery } from '@/repositories/body';
import { photoUri, pickPhoto, removePhoto, savePhoto, type PhotoSource } from '@/services/photos';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, EmptyState, Field, Icon, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

type Photo = { id: number; date: string; view: PhotoView; fileName: string };

export default function Fotos() {
  const { data: photos } = useLiveQuery(photosQuery(db));
  const { data: weights } = useLiveQuery(weightsQuery(db));
  const [view, setView] = useState<PhotoView>('frontal');
  const [date, setDate] = useState(toISODate());
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<Photo | null>(null);
  if (!photos) return null;
  const days = groupPhotosByDate(photos as Photo[]);

  const add = async (source: PhotoSource) => {
    if (!isValidISODate(date)) return;
    setBusy(true);
    try {
      const uri = await pickPhoto(source);
      if (uri) await savePhoto(uri, date, view);
    } catch (e) {
      showAlert('No se pudo guardar la foto', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {days.length >= 2 ? <BigButton title="Comparar fotos" icon="compare" onPress={() => router.push('/cuerpo/comparar')} /> : null}

      <Card>
        <Txt variant="label" color={colors.textDim}>
          Añadir foto
        </Txt>
        <Segmented options={PHOTO_VIEWS} value={view} onChange={setView} />
        <Field label="Fecha" value={date} onChangeText={setDate} error={isValidISODate(date) ? null : 'AAAA-MM-DD'} />
        <Row>
          <BigButton title="Cámara" icon="camera" style={{ flex: 1 }} loading={busy} onPress={() => add('camara')} />
          <BigButton title="Galería" icon="image-multiple" kind="secondary" style={{ flex: 1 }} disabled={busy} onPress={() => add('galeria')} />
        </Row>
        <Txt variant="caption" color={colors.textFaint}>
          Consejo: misma luz, distancia y postura, en ayunas. Las fotos se guardan solo dentro de la app (no en la galería).
        </Txt>
      </Card>

      <SectionTitle>Tus fotos</SectionTitle>
      {!days.length ? (
        <EmptyState icon="camera-outline" title="Sin fotos todavía" text="Haz una tanda (frontal, lateral y espalda) cada 2-4 semanas." />
      ) : (
        days.map((d) => {
          const w = weights ? trendAt(weights, d.date) : null;
          return (
            <View key={d.date} style={{ gap: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="h3">{formatDateLong(d.date)}</Txt>
                {w != null ? (
                  <Txt variant="small" color={colors.textDim}>
                    {`${fmtNum(w, 1)} kg`}
                  </Txt>
                ) : null}
              </Row>
              <Row gap={space.sm}>
                {PHOTO_VIEWS.map((v) => {
                  const p = d.views[v.value];
                  return p ? (
                    <Pressable key={v.value} style={styles.slot} onPress={() => setViewer(p)} accessibilityLabel={`Foto ${v.label} del ${d.date}`}>
                      <Image source={photoUri(p.fileName)} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <View style={styles.slotLabel}>
                        <Txt variant="caption">{v.label}</Txt>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      key={v.value}
                      style={[styles.slot, styles.empty]}
                      onPress={() => {
                        setView(v.value);
                        setDate(d.date);
                      }}>
                      <Icon name="plus" color={colors.textFaint} />
                      <Txt variant="caption" color={colors.textFaint}>
                        {v.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          );
        })
      )}
      {days.length === 1 ? <Banner kind="info">Con fotos de dos fechas distintas podrás compararlas lado a lado.</Banner> : null}

      <PhotoViewer photo={viewer} onClose={() => setViewer(null)} />
    </Screen>
  );
}

function PhotoViewer({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.md }}>
        {photo ? (
          <>
            <Image source={photoUri(photo.fileName)} style={{ flex: 1 }} contentFit="contain" />
            <View style={{ padding: space.lg, gap: space.sm }}>
              <Txt variant="h3">{`${PHOTO_VIEWS.find((v) => v.value === photo.view)?.label} · ${formatDateLong(photo.date)}`}</Txt>
              <Row>
                <BigButton title="Cerrar" kind="secondary" style={{ flex: 1 }} onPress={onClose} />
                <BigButton
                  title="Borrar"
                  icon="delete-outline"
                  kind="ghost"
                  style={{ flex: 1 }}
                  onPress={() =>
                    showAlert('Borrar foto', 'La foto se borrará de la app. No se puede deshacer.', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Borrar',
                        style: 'destructive',
                        onPress: async () => {
                          await removePhoto(photo.id, photo.fileName);
                          onClose();
                        },
                      },
                    ])
                  }
                />
              </Row>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  slotLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 4, backgroundColor: colors.overlay, alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
});
