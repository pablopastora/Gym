import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { formatDateShort } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { measurementsQuery, photosQuery, weightsQuery } from '@/repositories/body';
import { getAllRecords } from '@/repositories/progress';
import { MeasurementChart, WeightChart } from '@/ui/BodyCharts';
import { BigButton, Card, ListRow, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { DeloadCard } from '@/ui/DeloadCard';
import { colors, radius, space } from '@/ui/theme';
import { WeeklySummary } from '@/ui/WeeklySummary';

type Tab = 'cuerpo' | 'fuerza';

export default function Progreso() {
  const [tab, setTab] = useState<Tab>('cuerpo');
  return (
    <Screen>
      <Segmented
        options={[
          { value: 'cuerpo', label: 'Cuerpo' },
          { value: 'fuerza', label: 'Fuerza' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'cuerpo' ? <Cuerpo /> : <Fuerza />}
    </Screen>
  );
}

function Cuerpo() {
  const profile = useProfile();
  const { data: weights } = useLiveQuery(weightsQuery(db));
  const { data: measures } = useLiveQuery(measurementsQuery(db));
  const { data: photos } = useLiveQuery(photosQuery(db));
  const [chartMode, setChartMode] = useState<'peso' | 'imc'>('peso');
  if (!profile || !weights || !measures || !photos) return null;
  const photoDates = new Set(photos.map((p) => p.date)).size;

  return (
    <View style={{ gap: space.lg }}>
      <SectionTitle>Esta semana</SectionTitle>
      <WeeklySummary profile={profile} />

      <Row gap={space.sm}>
        <BigButton title="Peso" icon="scale-bathroom" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => router.push('/cuerpo/peso')} />
        <BigButton title="Medidas" icon="tape-measure" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => router.push('/cuerpo/medidas')} />
      </Row>
      <Row gap={space.sm}>
        <BigButton title="Fotos" icon="camera-outline" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => router.push('/cuerpo/fotos')} />
        <BigButton
          title="Comparar"
          icon="compare"
          kind="secondary"
          style={{ flex: 1, paddingHorizontal: space.sm }}
          disabled={photoDates < 2}
          onPress={() => router.push('/cuerpo/comparar')}
        />
      </Row>

      <SectionTitle>Evolución</SectionTitle>
      <Card>
        <Segmented
          options={[
            { value: 'peso', label: 'Peso' },
            { value: 'imc', label: 'IMC' },
          ]}
          value={chartMode}
          onChange={setChartMode}
        />
        <WeightChart key={chartMode} entries={weights} goalKg={profile.goalWeightKg} mode={chartMode} heightCm={profile.heightCm} />
      </Card>

      <SectionTitle>Perímetros</SectionTitle>
      <Card onPress={() => router.push('/cuerpo/medidas')}>
        <MeasurementChart rows={measures} />
      </Card>
    </View>
  );
}

function Fuerza() {
  const { data: records } = useAsyncQuery('progress-records', () => getAllRecords(db));
  return (
    <View style={{ gap: space.lg }}>
      <DeloadCard compactWhenNone={false} />
      <SectionTitle
        right={records?.length ? <Txt variant="caption" color={colors.textFaint}>{`${records.length} ${records.length === 1 ? 'ejercicio' : 'ejercicios'}`}</Txt> : undefined}>
        Evolución por ejercicio
      </SectionTitle>
      {records?.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {records.map((r) => (
            <ListRow
              key={r.exerciseId}
              icon="chart-line"
              title={r.nameEs}
              subtitle={[
                r.records.e1rm ? `1RM est. ${fmtNum(r.records.e1rm.value, 1)} kg` : null,
                r.records.peso_max ? `máx. ${r.records.peso_max.detail}` : null,
                `última ${formatDateShort(r.lastDate)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => router.push({ pathname: '/ejercicio/historial/[id]', params: { id: r.exerciseId } })}
            />
          ))}
        </View>
      ) : (
        <Txt color={colors.textDim}>Termina tu primer entreno para ver aquí la evolución de tu fuerza.</Txt>
      )}
      <BigButton title="Récords personales" icon="trophy-outline" kind="secondary" onPress={() => router.push('/records')} />
    </View>
  );
}
