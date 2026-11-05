import { View } from 'react-native';

import { db } from '@/db/client';
import { startOfWeek } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import type { MuscleCell } from '@/domain/muscleMap';
import { useAsyncQuery } from '@/hooks/useDb';
import { useToday } from '@/hooks/useToday';
import { muscleMapSince } from '@/repositories/progress';

import { Card, Row, Txt } from './components';
import { colors, radius, space } from './theme';

const LEVEL_BG: Record<MuscleCell['level'], string> = {
  nada: colors.surface2,
  bajo: colors.accentDim,
  medio: colors.accentPressed,
  objetivo: colors.accent,
};

/** Mapa muscular de la semana: series por grupo frente al objetivo. */
export function MuscleMapCard() {
  const today = useToday();
  const { data } = useAsyncQuery(`muscle-map-${today}`, () => muscleMapSince(db, startOfWeek(today)));
  if (!data) return null;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="label" color={colors.textDim}>
          Mapa muscular · esta semana
        </Txt>
        <Txt variant="caption" color={colors.textFaint}>
          series / objetivo
        </Txt>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {data.map((c) => (
          <View
            key={c.key}
            style={{ width: '48%', flexGrow: 1, borderRadius: radius.md, padding: space.md, backgroundColor: LEVEL_BG[c.level], gap: 4 }}
            accessibilityLabel={`${c.label}: ${c.sets} de ${c.target} series`}>
            <Txt variant="bodyBold" color={c.level === 'nada' ? colors.textDim : colors.text}>
              {c.label}
            </Txt>
            <Txt variant="displayS" color={c.level === 'nada' ? colors.textFaint : colors.text}>
              {`${fmtNum(c.sets, 1)} / ${c.target}`}
            </Txt>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.bg, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, c.ratio * 100)}%`, height: 4, backgroundColor: c.level === 'objetivo' ? colors.text : colors.accentText }} />
            </View>
          </View>
        ))}
      </View>
      <Txt variant="caption" color={colors.textFaint}>
        Principal = 1 serie; secundario = 0,5. Objetivo semanal mínimo por grupo (pierna 12, pecho y espalda 10, hombro 8, brazos 6, abdominales 4).
      </Txt>
    </Card>
  );
}
