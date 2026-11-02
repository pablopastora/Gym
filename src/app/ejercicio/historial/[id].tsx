import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { formatDateShort } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { computeRecords, RECORD_LABELS } from '@/domain/records';
import { useAsyncQuery } from '@/hooks/useDb';
import { allSessionsByExercise } from '@/repositories/progress';
import { Card, EmptyState, Icon, ListRow, Row, SectionTitle, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { LineChart } from '@/ui/LineChart';
import { chart, colors, radius, space } from '@/ui/theme';

type Metric = 'e1rm' | 'peso' | 'volumen';

export default function HistorialEjercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ex } = useLiveQuery(db.select({ nameEs: exercise.nameEs }).from(exercise).where(eq(exercise.id, id)), [id]);
  const { data } = useAsyncQuery(`history-${id}`, async () => computeRecords((await allSessionsByExercise(db, id)).get(id) ?? []));
  const [metric, setMetric] = useState<Metric>('e1rm');

  if (!data) return null;
  const { records, history } = data;
  const name = ex?.[0]?.nameEs ?? '';

  if (!history.length) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Txt variant="h1">{name}</Txt>
        <EmptyState icon="chart-line" title="Sin historial" text="Cuando completes series de este ejercicio verás aquí su evolución y tus récords." />
      </Screen>
    );
  }

  const first = history[0].date;
  // Eje X = orden de las sesiones (espaciado uniforme, también si hay dos el mismo día).
  const points = history
    .map((h, i) => {
      const y = metric === 'e1rm' ? h.bestE1rm : metric === 'peso' ? h.maxWeight : h.volume;
      const recType = metric === 'e1rm' ? 'e1rm' : metric === 'peso' ? 'peso_max' : 'volumen';
      return y == null ? null : { x: i, y, highlight: h.records.includes(recType) };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Txt variant="h1">{name}</Txt>

      <Card>
        <Row align="flex-start">
          <Stat label="1RM estimado" value={records.e1rm ? `${fmtNum(records.e1rm.value, 1)}` : '—'} sub={records.e1rm ? formatDateShort(records.e1rm.date) : undefined} color={colors.accentText} />
          <Stat label="Peso máximo" value={records.peso_max ? fmtNum(records.peso_max.value, 2) : '—'} sub={records.peso_max?.detail} />
          <Stat label="Volumen" value={records.volumen ? fmtNum(records.volumen.value, 0) : '—'} sub="kg en una sesión" />
        </Row>
      </Card>

      <Segmented
        options={[
          { value: 'e1rm', label: '1RM est.' },
          { value: 'peso', label: 'Peso máx.' },
          { value: 'volumen', label: 'Volumen' },
        ]}
        value={metric}
        onChange={setMetric}
      />
      <Card>
        <LineChart
          series={[{ points, area: true }]}
          formatY={(v) => fmtNum(v, 0)}
          xLabels={[formatDateShort(first), formatDateShort(history.at(-1)!.date)]}
          emptyText="Necesitas al menos 2 sesiones para ver la gráfica."
        />
        <Row gap={space.sm}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: chart.record }} />
          <Txt variant="caption" color={colors.textDim}>
            Sesión con récord
          </Txt>
        </Row>
      </Card>

      <SectionTitle>Sesiones</SectionTitle>
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
        {[...history].reverse().map((h) => (
          <ListRow
            key={h.workoutId}
            title={formatDateShort(h.date)}
            subtitle={[
              h.maxWeight != null ? `${fmtNum(h.maxWeight, 2)} kg × ${h.maxWeightReps}` : null,
              h.bestE1rm != null ? `1RM est. ${fmtNum(h.bestE1rm, 1)}` : null,
              `vol. ${fmtNum(h.volume, 0)} kg`,
              h.records.length ? `récord: ${h.records.map((r) => RECORD_LABELS[r].toLowerCase()).join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={h.records.length ? <Icon name="trophy" color={colors.accentText} size={20} /> : undefined}
            onPress={() => router.push({ pathname: '/sesion/resumen/[id]', params: { id: h.workoutId } })}
          />
        ))}
      </View>
      <Txt variant="caption" color={colors.textFaint}>
        1RM estimado con la fórmula de Epley (peso × (1 + reps/30)), solo con series de hasta 12 reps. Las series de calentamiento no cuentan.
      </Txt>
    </Screen>
  );
}
