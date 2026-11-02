import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { formatDateShort } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { getAllRecords } from '@/repositories/progress';
import { Card, EmptyState, Row, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

type Sort = 'reciente' | 'e1rm' | 'nombre';

export default function Records() {
  const { data } = useAsyncQuery('all-records', () => getAllRecords(db));
  const [sort, setSort] = useState<Sort>('reciente');
  const rows = useMemo(() => {
    const r = [...(data ?? [])];
    if (sort === 'e1rm') r.sort((a, b) => (b.records.e1rm?.value ?? 0) - (a.records.e1rm?.value ?? 0));
    if (sort === 'nombre') r.sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es'));
    return r;
  }, [data, sort]);

  if (!data) return null;
  if (!data.length) {
    return (
      <Screen>
        <EmptyState icon="trophy-outline" title="Sin récords todavía" text="Termina tu primer entreno y aquí aparecerán tus mejores marcas." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Segmented
        options={[
          { value: 'reciente', label: 'Recientes' },
          { value: 'e1rm', label: '1RM' },
          { value: 'nombre', label: 'A-Z' },
        ]}
        value={sort}
        onChange={setSort}
      />
      {rows.map((r) => (
        <Card key={r.exerciseId} onPress={() => router.push({ pathname: '/ejercicio/historial/[id]', params: { id: r.exerciseId } })}>
          <View>
            <Txt variant="h3">{r.nameEs}</Txt>
            <Txt variant="caption" color={colors.textFaint}>
              {`${r.sessions} ${r.sessions === 1 ? 'sesión' : 'sesiones'} · última ${formatDateShort(r.lastDate)}`}
            </Txt>
          </View>
          <Row align="flex-start">
            <Stat label="1RM est." value={r.records.e1rm ? fmtNum(r.records.e1rm.value, 1) : '—'} color={colors.accentText} />
            <Stat label="Peso máx." value={r.records.peso_max ? fmtNum(r.records.peso_max.value, 2) : '—'} sub={r.records.peso_max?.detail} />
            <Stat label="Volumen" value={r.records.volumen ? fmtNum(r.records.volumen.value, 0) : '—'} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
