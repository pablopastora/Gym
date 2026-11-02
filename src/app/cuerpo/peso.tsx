import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { movingAverage7 } from '@/domain/body';
import { formatDateLong, isValidISODate, toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { useProfile } from '@/hooks/useDb';
import { deleteWeight, upsertWeight, weightsQuery } from '@/repositories/body';
import { showAlert } from '@/ui/alert';
import { WeightChart } from '@/ui/BodyCharts';
import { BigButton, Card, Field, ListRow, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius } from '@/ui/theme';

export default function PesoScreen() {
  const profile = useProfile();
  const { data } = useLiveQuery(weightsQuery(db));
  const [date, setDate] = useState(toISODate());
  const [kg, setKg] = useState('');
  if (!data || !profile) return null;

  const trend = new Map(movingAverage7(data).map((t) => [t.date, t.trendKg]));
  const value = parseDecimal(kg);
  const valid = value != null && value >= 35 && value <= 300 && isValidISODate(date) && date <= toISODate();

  return (
    <Screen>
      <Card>
        <WeightChart entries={data} goalKg={profile.goalWeightKg} />
      </Card>

      <SectionTitle>Añadir o corregir un día</SectionTitle>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Fecha" value={date} onChangeText={setDate} error={isValidISODate(date) ? null : 'AAAA-MM-DD'} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Peso" suffix="kg" keyboardType="decimal-pad" value={kg} onChangeText={setKg} />
        </View>
      </Row>
      <BigButton
        title="Guardar"
        icon="content-save"
        disabled={!valid}
        onPress={async () => {
          await upsertWeight(db, date, value!);
          setKg('');
        }}
      />

      <SectionTitle>Registros</SectionTitle>
      {data.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {[...data].reverse().map((w) => (
            <ListRow
              key={w.id}
              title={`${fmtNum(w.weightKg, 2)} kg`}
              subtitle={`${formatDateLong(w.date)} · media 7 días ${fmtNum(trend.get(w.date) ?? w.weightKg, 1)} kg`}
              right={<Txt variant="caption" color={colors.textFaint}>Borrar</Txt>}
              onPress={() =>
                showAlert('Borrar registro', `¿Borrar ${fmtNum(w.weightKg, 2)} kg del ${formatDateLong(w.date)}?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Borrar', style: 'destructive', onPress: () => deleteWeight(db, w.id) },
                ])
              }
            />
          ))}
        </View>
      ) : (
        <Txt color={colors.textDim}>Aún no hay registros. El más rápido es desde Inicio.</Txt>
      )}
      <Txt variant="caption" color={colors.textFaint}>
        Lo que importa es la media de 7 días: el peso diario varía ±1 kg por agua, sal y digestión.
      </Txt>
    </Screen>
  );
}
