import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { chart, fonts } from './theme';
import { Txt } from './components';

export interface ChartPoint {
  /** Posición horizontal (p. ej. días desde el inicio). */
  x: number;
  y: number;
  /** Punto destacado (récord). */
  highlight?: boolean;
}

export interface ChartSeries {
  points: ChartPoint[];
  color?: string;
  /** Relleno bajo la línea. */
  area?: boolean;
  /** Mostrar puntos. */
  dots?: boolean;
  dashed?: boolean;
  strokeWidth?: number;
}

/**
 * Gráfica de líneas ligera (react-native-svg), con los colores de `chart` del tema.
 * Varias series comparten ejes; los puntos `highlight` se pintan como récord.
 */
export function LineChart({
  series,
  height = 190,
  formatY = (v) => String(Math.round(v)),
  xLabels,
  emptyText = 'Aún no hay datos suficientes',
}: {
  series: ChartSeries[];
  height?: number;
  formatY?: (v: number) => string;
  /** Etiquetas del eje X: [izquierda, derecha]. */
  xLabels?: [string, string];
  emptyText?: string;
}) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.points);
  const pad = { l: 44, r: 12, t: 12, b: xLabels ? 24 : 8 };

  if (all.length < 2) {
    return (
      <View style={{ height: 80, justifyContent: 'center' }}>
        <Txt variant="small" color={chart.label}>
          {emptyText}
        </Txt>
      </View>
    );
  }

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const span = maxY - minY || Math.max(1, Math.abs(maxY) * 0.05);
  minY -= span * 0.12;
  maxY += span * 0.12;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) === minX ? minX + 1 : Math.max(...xs);
  const iw = Math.max(1, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX)) * iw;
  const sy = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY)) * ih;
  const ticks = [0, 1, 2, 3].map((i) => minY + ((maxY - minY) * i) / 3);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={chart.primary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={chart.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((t) => (
            <Line key={t} x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke={chart.grid} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={pad.l - 6} y={sy(t) + 4} fill={chart.axis} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
              {formatY(t)}
            </SvgText>
          ))}
          {series.map((s, si) => {
            const pts = [...s.points].sort((a, b) => a.x - b.x);
            if (!pts.length) return null;
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
            const color = s.color ?? chart.primary;
            return (
              <G key={si}>
                {s.area && pts.length > 1 ? (
                  <Path
                    d={`${d} L${sx(pts.at(-1)!.x).toFixed(1)},${pad.t + ih} L${sx(pts[0].x).toFixed(1)},${pad.t + ih} Z`}
                    fill="url(#area)"
                  />
                ) : null}
                <Path
                  d={d}
                  stroke={color}
                  strokeWidth={s.strokeWidth ?? 2.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '6,5' : undefined}
                />
                {s.dots !== false
                  ? pts.map((p, i) => (
                      <Circle
                        key={i}
                        cx={sx(p.x)}
                        cy={sy(p.y)}
                        r={p.highlight ? 5.5 : 3}
                        fill={p.highlight ? chart.record : color}
                        stroke={p.highlight ? chart.recordStroke : 'none'}
                        strokeWidth={p.highlight ? 1.5 : 0}
                      />
                    ))
                  : null}
              </G>
            );
          })}
          {xLabels ? (
            <>
              <SvgText x={pad.l} y={height - 6} fill={chart.axis} fontSize={11} fontFamily={fonts.medium}>
                {xLabels[0]}
              </SvgText>
              <SvgText x={width - pad.r} y={height - 6} fill={chart.axis} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
                {xLabels[1]}
              </SvgText>
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
