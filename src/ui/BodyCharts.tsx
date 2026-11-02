import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { bmi, measurementSummary, MEASUREMENT_FIELDS, weightChartData, type MeasurementKey, type MeasurementRow, type WeightEntry } from '@/domain/body';
import { addDays, diffDays, formatDateShort, toISODate } from '@/domain/dates';
import { fmtNum } from '@/domain/format';

import { Chip, Row, Segmented, Txt } from './components';
import { LineChart } from './LineChart';
import { chart, colors, space } from './theme';

type Range = '1m' | '3m' | '6m' | 'todo';
const RANGE_DAYS: Record<Range, number | null> = { '1m': 30, '3m': 90, '6m': 180, todo: null };

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <Row gap={space.lg} style={{ flexWrap: 'wrap' }}>
      {items.map((i) => (
        <Row key={i.label} gap={space.xs}>
          <View style={{ width: 14, height: 3, backgroundColor: i.color, opacity: i.dashed ? 0.6 : 1 }} />
          <Txt variant="caption" color={colors.textDim}>
            {i.label}
          </Txt>
        </Row>
      ))}
    </Row>
  );
}

function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <Segmented
      options={[
        { value: '1m', label: '1 mes' },
        { value: '3m', label: '3 meses' },
        { value: '6m', label: '6 meses' },
        { value: 'todo', label: 'Todo' },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

/** Peso diario (puntos grises) + media móvil de 7 días (línea roja) + objetivo. */
export function WeightChart({ entries, goalKg, mode = 'peso', heightCm }: { entries: WeightEntry[]; goalKg?: number | null; mode?: 'peso' | 'imc'; heightCm?: number }) {
  const [range, setRange] = useState<Range>('3m');
  const days = RANGE_DAYS[range];
  const from = days ? addDays(toISODate(), -days) : null;
  const tr = (y: number) => (mode === 'imc' && heightCm ? bmi(y, heightCm) : y);
  const d = weightChartData(entries, from);
  const raw = d.raw.map((p) => ({ ...p, y: tr(p.y) }));
  const trend = d.trend.map((p) => ({ ...p, y: tr(p.y) }));
  return (
    <View style={{ gap: space.md }}>
      <RangePicker value={range} onChange={setRange} />
      <LineChart
        series={[
          { points: raw, color: chart.tertiary, line: false },
          { points: trend, color: chart.primary, dots: false, area: true, strokeWidth: 3 },
        ]}
        formatY={(v) => fmtNum(v, 1)}
        refLine={goalKg != null && mode === 'peso' ? { y: goalKg, label: `Objetivo ${fmtNum(goalKg, 1)}` } : mode === 'imc' ? { y: 25, label: 'IMC 25' } : undefined}
        xLabels={d.start && d.end ? [formatDateShort(d.start), formatDateShort(d.end)] : undefined}
        emptyText="Registra tu peso al menos dos días para ver la gráfica."
      />
      <Legend
        items={[
          { color: chart.tertiary, label: mode === 'imc' ? 'IMC diario' : 'Peso diario' },
          { color: chart.primary, label: 'Media 7 días' },
          ...(goalKg != null || mode === 'imc' ? [{ color: chart.secondary, label: mode === 'imc' ? 'Límite sobrepeso' : 'Objetivo', dashed: true }] : []),
        ]}
      />
    </View>
  );
}

/** Evolución de un perímetro (por defecto la cintura). */
export function MeasurementChart({ rows, initial = 'waistCm' }: { rows: MeasurementRow[]; initial?: MeasurementKey }) {
  const [key, setKey] = useState<MeasurementKey>(initial);
  const field = MEASUREMENT_FIELDS.find((f) => f.key === key)!;
  const pts = rows.filter((r) => r[key] != null).sort((a, b) => a.date.localeCompare(b.date));
  const first = pts[0]?.date;
  const s = measurementSummary(rows)[key];
  return (
    <View style={{ gap: space.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {MEASUREMENT_FIELDS.map((f) => (
          <Chip key={f.key} label={f.label} active={key === f.key} onPress={() => setKey(f.key)} />
        ))}
      </ScrollView>
      {s ? (
        <Txt color={colors.textDim}>
          {`${field.label}: ${fmtNum(s.last, 1)} ${field.unit}`}
          {pts.length > 1 ? ` · ${s.change > 0 ? '+' : ''}${fmtNum(s.change, 1)} ${field.unit} desde ${formatDateShort(first!)}` : ''}
        </Txt>
      ) : null}
      <LineChart
        series={[{ points: pts.map((r) => ({ x: diffDays(first!, r.date), y: r[key]! })), area: true }]}
        formatY={(v) => fmtNum(v, 1)}
        xLabels={pts.length > 1 ? [formatDateShort(pts[0].date), formatDateShort(pts.at(-1)!.date)] : undefined}
        emptyText={`Registra la medida «${field.label.toLowerCase()}» al menos dos veces para ver su evolución.`}
      />
    </View>
  );
}

