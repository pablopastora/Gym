import { View } from 'react-native';

import { db } from '@/db/client';
import { dayOfMonth } from '@/domain/calendar';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { weeklyIntakeVsExpenditure } from '@/repositories/diary';

import { BarChart } from '../BarChart';
import { Card, Row, Stat, Txt } from '../components';
import { chart, colors, space } from '../theme';

/** Media diaria de lo comido frente al gasto estimado, por semana (días registrados). */
export function WeeklyIntake({ today }: { today: string }) {
  const { data } = useAsyncQuery(`weekly-intake-${today}`, () => weeklyIntakeVsExpenditure(db, today, 8));
  if (!data) return null;
  const cur = data.at(-1)!;
  const bal = cur.avgIntake != null && cur.avgExpenditure != null ? cur.avgIntake - cur.avgExpenditure : null;
  return (
    <Card>
      <Row align="flex-start">
        <Stat label="Media esta semana" value={cur.avgIntake != null ? fmtNum(cur.avgIntake, 0) : '—'} sub={`kcal/día comidas · ${cur.loggedDays} días`} color={colors.accentText} />
        <Stat label="Gasto medio" value={cur.avgExpenditure != null ? `~${fmtNum(cur.avgExpenditure, 0)}` : '—'} sub="kcal/día estimadas" />
        <Stat label="Balance" value={bal != null ? `${bal > 0 ? '+' : '−'}${fmtNum(Math.abs(bal), 0)}` : '—'} sub="kcal/día" />
      </Row>
      <BarChart
        grouped
        bars={data.map((w, i) => ({ label: `${dayOfMonth(w.weekStart)}`, values: [w.avgIntake ?? 0, w.avgExpenditure ?? 0], highlight: i === data.length - 1 }))}
        formatY={(v) => fmtNum(v, 0)}
      />
      <Row gap={space.lg}>
        <Row gap={space.xs}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: chart.primary }} />
          <Txt variant="caption" color={colors.textDim}>
            Comido
          </Txt>
        </Row>
        <Row gap={space.xs}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: chart.secondary }} />
          <Txt variant="caption" color={colors.textDim}>
            Gastado
          </Txt>
        </Row>
        <Txt variant="caption" color={colors.textFaint}>
          Media diaria · semanas (lunes)
        </Txt>
      </Row>
    </Card>
  );
}
