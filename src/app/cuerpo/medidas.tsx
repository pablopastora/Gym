import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { measurementSummary, MEASUREMENT_FIELDS, type MeasurementKey } from '@/domain/body';
import { formatDateLong, isValidISODate, toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { deleteMeasurement, measurementsQuery, upsertMeasurement } from '@/repositories/body';
import { showAlert } from '@/ui/alert';
import { MeasurementChart } from '@/ui/BodyCharts';
import { BigButton, Card, Field, ListRow, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius } from '@/ui/theme';

const RANGES: Record<MeasurementKey, [number, number]> = {
  waistCm: [50, 200],
  chestCm: [60, 200],
  armCm: [20, 70],
  thighCm: [30, 100],
  hipCm: [60, 200],
  bodyFatPct: [3, 60],
};

export default function Medidas() {
  const { data } = useLiveQuery(measurementsQuery(db));
  const [date, setDate] = useState(toISODate());
  const [vals, setVals] = useState<Partial<Record<MeasurementKey, string>>>({});
  if (!data) return null;
  const summary = measurementSummary(data);

  const parsed = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, vals[f.key] ? parseDecimal(vals[f.key]!) : null])) as Record<
    MeasurementKey,
    number | null
  >;
  const errors = Object.fromEntries(
    MEASUREMENT_FIELDS.map((f) => {
      const v = parsed[f.key];
      const [lo, hi] = RANGES[f.key];
      return [f.key, vals[f.key] && (v == null || v < lo || v > hi) ? `Entre ${lo} y ${hi}` : null];
    }),
  ) as Record<MeasurementKey, string | null>;
  const any = Object.values(parsed).some((v) => v != null);
  const valid = any && !Object.values(errors).some(Boolean) && isValidISODate(date);

  const save = async () => {
    await upsertMeasurement(db, date, parsed);
    setVals({});
  };

  const field = (key: MeasurementKey, label: string, unit: string) => (
    <Field
      key={key}
      label={label}
      suffix={unit}
      keyboardType="decimal-pad"
      value={vals[key] ?? ''}
      onChangeText={(t) => setVals({ ...vals, [key]: t })}
      placeholder={summary[key] ? `Último: ${fmtNum(summary[key]!.last, 1)}` : undefined}
      error={errors[key]}
    />
  );

  return (
    <Screen>
      <Card>
        <MeasurementChart rows={data} />
      </Card>

      <SectionTitle>Nueva medición</SectionTitle>
      <Field label="Fecha" value={date} onChangeText={setDate} error={isValidISODate(date) ? null : 'AAAA-MM-DD'} />
      {field('waistCm', 'Cintura (a la altura del ombligo) · la principal', 'cm')}
      <Row align="flex-start">
        <View style={{ flex: 1 }}>{field('chestCm', 'Pecho', 'cm')}</View>
        <View style={{ flex: 1 }}>{field('armCm', 'Brazo (contraído)', 'cm')}</View>
      </Row>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>{field('thighCm', 'Muslo', 'cm')}</View>
        <View style={{ flex: 1 }}>{field('hipCm', 'Cadera', 'cm')}</View>
      </Row>
      {field('bodyFatPct', '% de grasa corporal (opcional)', '%')}
      <Txt variant="caption" color={colors.textFaint}>
        Mide en ayunas, siempre en el mismo sitio y sin apretar la cinta. Solo se guardan los campos que rellenes.
      </Txt>
      <BigButton title="Guardar medidas" icon="content-save" disabled={!valid} onPress={save} />

      <SectionTitle>Historial</SectionTitle>
      {data.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {[...data].reverse().map((m) => (
            <ListRow
              key={m.id}
              title={formatDateLong(m.date)}
              subtitle={MEASUREMENT_FIELDS.filter((f) => m[f.key] != null)
                .map((f) => `${f.label} ${fmtNum(m[f.key]!, 1)}${f.unit === '%' ? ' %' : ''}`)
                .join(' · ')}
              right={<Txt variant="caption" color={colors.textFaint}>Borrar</Txt>}
              onPress={() =>
                showAlert('Borrar medición', `¿Borrar las medidas del ${formatDateLong(m.date)}?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Borrar', style: 'destructive', onPress: () => deleteMeasurement(db, m.id) },
                ])
              }
            />
          ))}
        </View>
      ) : (
        <Txt color={colors.textDim}>Sin mediciones todavía. Con la cintura cada 1-2 semanas es suficiente.</Txt>
      )}
    </Screen>
  );
}
