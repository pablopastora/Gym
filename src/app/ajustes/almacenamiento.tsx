import { count, isNotNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';

import { db } from '@/db/client';
import { exercise, progressPhoto } from '@/db/schema';
import { fmtNum } from '@/domain/format';
import { clearMediaCache, VIDEO_CACHE_BYTES, videoCacheSize } from '@/services/mediaCache';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, Row, Screen, Stat, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

const mb = (b: number) => `${fmtNum(b / (1024 * 1024), 0)} MB`;

export default function Almacenamiento() {
  const [videoBytes, setVideoBytes] = useState(() => videoCacheSize());
  const { data: withVideo } = useLiveQuery(db.select({ n: count() }).from(exercise).where(isNotNull(exercise.videoUrl)));
  const { data: photos } = useLiveQuery(db.select({ n: count() }).from(progressPhoto));

  const clear = () =>
    showAlert(
      'Vaciar caché',
      'Se borrarán las imágenes y vídeos de ejercicios descargados; se volverán a descargar al verlos. Tus fotos de progreso y ejercicios propios NO se borran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            await clearMediaCache();
            setVideoBytes(videoCacheSize());
          },
        },
      ],
    );

  return (
    <Screen>
      <Card>
        <Row align="flex-start">
          <Stat label="Caché de vídeo" value={videoBytes != null ? mb(videoBytes) : '—'} sub={`máx. ${mb(VIDEO_CACHE_BYTES)}`} />
          <Stat label="Vídeos encontrados" value={String(withVideo?.[0]?.n ?? 0)} sub="ejercicios con vídeo de wger" />
        </Row>
        <Row align="flex-start">
          <Stat label="Fotos de progreso" value={String(photos?.[0]?.n ?? 0)} sub="guardadas en la app" />
        </Row>
      </Card>
      <Txt color={colors.textDim}>
        Las imágenes y los vídeos de los ejercicios se descargan la primera vez que los ves y se guardan en caché para no
        volver a descargarlos. Si la caché se llena, se descartan los menos usados.
      </Txt>
      <BigButton title="Vaciar caché de imágenes y vídeos" icon="broom" kind="secondary" onPress={clear} />
      <Banner kind="info">Las fotos de progreso y los ejercicios propios están en la copia de seguridad (fase 7), no en la caché.</Banner>
    </Screen>
  );
}
