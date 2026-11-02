import { router } from 'expo-router';
import { View } from 'react-native';

import { db } from '@/db/client';
import { formatDateShort } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { getAllRecords } from '@/repositories/progress';
import { Banner, BigButton, ListRow, SectionTitle, Screen, Txt } from '@/ui/components';
import { DeloadCard } from '@/ui/DeloadCard';
import { colors, radius } from '@/ui/theme';

export default function Progreso() {
  const { data: records } = useAsyncQuery('progress-records', () => getAllRecords(db));

  return (
    <Screen>
      <DeloadCard compactWhenNone={false} />

      <SectionTitle right={records?.length ? <Txt variant="caption" color={colors.textFaint}>{`${records.length} ${records.length === 1 ? "ejercicio" : "ejercicios"}`}</Txt> : undefined}>
        Fuerza
      </SectionTitle>
      {records?.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {records.slice(0, 8).map((r) => (
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

      <Banner kind="info">Peso con media móvil, perímetros, fotos y resumen semanal llegan en la fase 5.</Banner>
    </Screen>
  );
}
