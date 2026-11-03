import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { Txt } from './components';
import { chart, fonts } from './theme';

export interface Bar {
  label: string;
  /** Segmentos apilados (p. ej. fuerza + cardio). */
  values: number[];
  highlight?: boolean;
}

/** Barras apiladas sencillas con los colores `chart` del tema. */
export function BarChart({ bars, height = 170, colors: segColors = [chart.primary, chart.secondary], formatY = (v: number) => String(Math.round(v)) }: {
  bars: Bar[];
  height?: number;
  colors?: string[];
  formatY?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...bars.map((b) => b.values.reduce((a, v) => a + v, 0)));
  if (!bars.some((b) => b.values.some((v) => v > 0))) {
    return (
      <Txt variant="small" color={chart.label}>
        Aún no hay datos.
      </Txt>
    );
  }
  const pad = { l: 40, r: 8, t: 10, b: 22 };
  const iw = Math.max(1, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const slot = iw / bars.length;
  const bw = Math.min(28, slot * 0.6);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={chart.grid} strokeWidth={1} />
          ))}
          {[0.5, 1].map((f) => (
            <SvgText key={`t${f}`} x={pad.l - 6} y={y(max * f) + 4} fill={chart.axis} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
              {formatY(max * f)}
            </SvgText>
          ))}
          {bars.map((b, i) => {
            const x = pad.l + slot * i + (slot - bw) / 2;
            let acc = 0;
            return b.values.map((v, j) => {
              const top = y(acc + v);
              const h = y(acc) - top;
              acc += v;
              return v > 0 ? (
                <Rect key={`${i}-${j}`} x={x} y={top} width={bw} height={h} rx={3} fill={segColors[j % segColors.length]} opacity={b.highlight || j > 0 ? 1 : 0.75} />
              ) : null;
            });
          })}
          {bars.map((b, i) => (
            <SvgText key={`l${i}`} x={pad.l + slot * i + slot / 2} y={height - 6} fill={b.highlight ? chart.record : chart.axis} fontSize={10} fontFamily={fonts.medium} textAnchor="middle">
              {b.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
