import { router } from 'expo-router';

import { db } from '@/db/client';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { activityByDay } from '@/repositories/kcal';

import { Card, Row, Stat, Txt } from './components';
import { colors } from './theme';

/** Actividad registrada hoy: kcal de fuerza y de cardio (también cardio suelto, sin entreno). */
export function TodayActivity({ today }: { today: string }) {
  const { data } = useAsyncQuery(`today-activity-${today}`, () => activityByDay(db, today, today));
  const d = data?.get(today);
  if (!d || (!d.strengthKcal && !d.cardioMin)) return null;
  return (
    <Card onPress={() => router.push('/(tabs)/entrenar')}>
      <Txt variant="label" color={colors.textDim}>
        Actividad de hoy
      </Txt>
      <Row align="flex-start">
        <Stat label="Fuerza" value={d.strengthKcal ? `~${fmtNum(d.strengthKcal, 0)}` : '—'} sub="kcal" />
        <Stat label="Cardio" value={d.cardioMin ? `~${fmtNum(d.cardioKcal, 0)}` : '—'} sub={d.cardioMin ? `kcal · ${fmtNum(d.cardioMin, 0)} min` : 'kcal'} />
        <Stat label="Total" value={`~${fmtNum(d.strengthKcal + d.cardioKcal, 0)}`} sub="kcal (estimación)" color={colors.accentText} />
      </Row>
    </Card>
  );
}
