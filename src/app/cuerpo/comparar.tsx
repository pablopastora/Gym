import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import {
  defaultComparison,
  groupPhotosByDate,
  measurementAt,
  PHOTO_VIEWS,
  trendAt,
  type MeasurementRow,
  type PhotoDay,
  type PhotoView,
  type WeightEntry,
} from '@/domain/body';
import { diffDays, formatDateShort } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { measurementsQuery, photosQuery, weightsQuery } from '@/repositories/body';
import { photoUri } from '@/services/photos';
import { Card, Chip, EmptyState, Icon, Row, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

export default function Comparar() {
  const { data: photos } = useLiveQuery(photosQuery(db));
  const { data: weights } = useLiveQuery(weightsQuery(db));
  const { data: measures } = useLiveQuery(measurementsQuery(db));
  if (!photos || !weights || !measures) return null;
  const days = groupPhotosByDate(photos);
  if (days.length < 2) {
    return (
      <Screen>
        <EmptyState icon="compare" title="Necesitas fotos de dos fechas" text="Añade fotos en dos días distintos para compararlas lado a lado." />
      </Screen>
    );
  }
  return <Comparator days={days} weights={weights} measures={measures} />;
}

function Comparator({ days, weights, measures }: { days: PhotoDay[]; weights: WeightEntry[]; measures: MeasurementRow[] }) {
  const [view, setView] = useState<PhotoView>('frontal');
  const [[a, b], setPair] = useState(() => defaultComparison(days, 'frontal') as [string, string]);
  const dates = days.map((d) => d.date).sort();
  const dayOf = (date: string) => days.find((d) => d.date === date)!;

  const wa = trendAt(weights, a);
  const wb = trendAt(weights, b);
  const ca = measurementAt(measures, 'waistCm', a);
  const cb = measurementAt(measures, 'waistCm', b);
  const weeks = Math.round(Math.abs(diffDays(a, b)) / 7);
  const sign = (n: number) => `${n > 0 ? '+' : ''}${fmtNum(n, 1)}`;
  const viewLabel = PHOTO_VIEWS.find((v) => v.value === view)!.label.toLowerCase();

  const renderPane = (date: string, label: string) => {
    const p = dayOf(date).views[view];
    return (
      <View key={label} style={{ flex: 1, gap: space.xs }}>
        <View style={styles.pane}>
          {p ? (
            <Image source={photoUri(p.fileName)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <View style={styles.missing}>
              <Icon name="image-off-outline" color={colors.textFaint} />
              <Txt variant="caption" color={colors.textFaint} style={{ textAlign: 'center' }}>
                {`Sin foto ${viewLabel} este día`}
              </Txt>
            </View>
          )}
          <View style={styles.tag}>
            <Txt variant="label" color={colors.onAccent}>
              {label}
            </Txt>
          </View>
        </View>
        <Txt variant="bodyBold" style={{ textAlign: 'center' }}>
          {formatDateShort(date)}
        </Txt>
      </View>
    );
  };

  const renderDateRow = (label: string, value: string, onPick: (d: string) => void) => (
    <View key={label} style={{ gap: space.xs }}>
      <Txt variant="label" color={colors.textDim}>
        {label}
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {dates.map((d) => (
          <Chip key={d} label={`${formatDateShort(d)}${dayOf(d).views[view] ? '' : ' ·'}`} active={d === value} onPress={() => onPick(d)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <Segmented options={PHOTO_VIEWS} value={view} onChange={setView} />

      <Row gap={space.sm} align="flex-start">
        {renderPane(a, 'Antes')}
        {renderPane(b, 'Después')}
      </Row>

      <Card>
        <Row align="flex-start">
          <Stat label="Peso" value={wa != null && wb != null ? `${sign(wb - wa)} kg` : '—'} sub={wa != null && wb != null ? `${fmtNum(wa, 1)} → ${fmtNum(wb, 1)}` : 'Sin datos de peso'} color={wa != null && wb != null && wb < wa ? colors.accentText : colors.text} />
          <Stat label="Cintura" value={ca != null && cb != null ? `${sign(cb - ca)} cm` : '—'} sub={ca != null && cb != null ? `${fmtNum(ca, 1)} → ${fmtNum(cb, 1)}` : 'Sin medidas'} color={ca != null && cb != null && cb < ca ? colors.accentText : colors.text} />
          <Stat label="Tiempo" value={`${weeks} sem.`} />
        </Row>
      </Card>

      {renderDateRow('Antes', a, (d) => setPair([d, b]))}
      {renderDateRow('Después', b, (d) => setPair([a, d]))}
      <Pressable onPress={() => setPair([b, a])} style={({ pressed }) => [styles.swap, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <Icon name="swap-horizontal" color={colors.textDim} />
        <Txt variant="button" color={colors.textDim}>
          Intercambiar
        </Txt>
      </Pressable>
      <Txt variant="caption" color={colors.textFaint}>
        Las fechas con «·» no tienen foto {viewLabel}. Cambia de vista arriba sin perder las fechas elegidas.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pane: { aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.sm },
  tag: { position: 'absolute', top: space.sm, left: space.sm, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  swap: { flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
