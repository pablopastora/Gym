import { View } from 'react-native';

import { db } from '@/db/client';
import { dayOfMonth } from '@/domain/calendar';
import { fmtNum } from '@/domain/format';
import { KCAL_EXPLANATION } from '@/domain/kcal';
import { useAsyncQuery } from '@/hooks/useDb';
import { useToday } from '@/hooks/useToday';
import { weeklyKcal } from '@/repositories/kcal';

import { showAlert } from './alert';
import { BarChart } from './BarChart';
import { Card, IconButton, Row, Stat, Txt } from './components';
import { chart, colors, space } from './theme';

/** Kcal estimadas por semana (fuerza + cardio), últimas 8 semanas. */
export function WeeklyKcal() {
  const today = useToday();
  const { data } = useAsyncQuery(`weekly-kcal-${today}`, () => weeklyKcal(db, today, 8));
  if (!data) return null;
  const cur = data.at(-1)!;
  const prev = data.slice(0, -1).filter((w) => w.total > 0);
  const avg = prev.length ? prev.reduce((a, w) => a + w.total, 0) / prev.length : null;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row align="flex-start" style={{ flex: 1 }}>
          <Stat label="Esta semana" value={`~${fmtNum(cur.total, 0)}`} sub={`kcal · fuerza ${fmtNum(cur.strength, 0)} + cardio ${fmtNum(cur.cardio, 0)}`} color={colors.accentText} />
          <Stat label="Media semanal" value={avg != null ? `~${fmtNum(avg, 0)}` : '—'} sub="kcal (semanas anteriores)" />
        </Row>
        <IconButton name="information-outline" label="Cómo se calculan las kcal" color={colors.textDim} onPress={() => showAlert('¿Cómo se calculan las kcal?', KCAL_EXPLANATION)} />
      </Row>
      <BarChart bars={data.map((w, i) => ({ label: `${dayOfMonth(w.weekStart)}`, values: [w.strength, w.cardio], highlight: i === data.length - 1 }))} formatY={(v) => fmtNum(v, 0)} />
      <Row gap={space.lg}>
        <Row gap={space.xs}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: chart.primary }} />
          <Txt variant="caption" color={colors.textDim}>
            Fuerza
          </Txt>
        </Row>
        <Row gap={space.xs}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: chart.secondary }} />
          <Txt variant="caption" color={colors.textDim}>
            Cardio
          </Txt>
        </Row>
        <Txt variant="caption" color={colors.textFaint}>
          Semanas (día del lunes) · estimación ±25 %
        </Txt>
      </Row>
    </Card>
  );
}
