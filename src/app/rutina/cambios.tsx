import { inArray } from 'drizzle-orm';
import { View } from 'react-native';

import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { formatDateLong, toISODate } from '@/domain/dates';
import { useAsyncQuery } from '@/hooks/useDb';
import { suggestionHistoryQuery } from '@/repositories/adapt';
import { Card, EmptyState, Icon, Row, Screen, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const STATUS = {
  aceptada: { label: 'Aplicada', icon: 'check-circle' as const, color: colors.accentText },
  rechazada: { label: 'Rechazada', icon: 'close-circle-outline' as const, color: colors.textDim },
  caducada: { label: 'Caducada', icon: 'clock-outline' as const, color: colors.textFaint },
};
const RULE = { refuerzo: 'Refuerzo', avance: 'Avance', equilibrio: 'Equilibrio' } as const;

/** Historial de sugerencias semanales: qué cambió, por qué y cuándo. */
export default function HistorialCambios() {
  const { data } = useAsyncQuery('suggestion-history', async () => {
    const rows = await suggestionHistoryQuery(db);
    const ids = [...new Set(rows.flatMap((r) => [r.exerciseId, r.suggestedExerciseId]).filter((x): x is string => !!x))];
    const names = ids.length ? await db.select({ id: exercise.id, n: exercise.nameEs }).from(exercise).where(inArray(exercise.id, ids)) : [];
    return { rows, names: new Map(names.map((x) => [x.id, x.n])) };
  });
  if (!data) return null;
  if (!data.rows.length) {
    return (
      <Screen>
        <EmptyState icon="history" title="Sin cambios todavía" text="Aquí verás las sugerencias semanales que aceptes o rechaces, con su motivo." />
      </Screen>
    );
  }
  return (
    <Screen>
      {data.rows.map((r) => {
        const st = STATUS[r.status as keyof typeof STATUS];
        const from = r.exerciseId ? data.names.get(r.exerciseId) : null;
        const to = r.suggestedExerciseId ? data.names.get(r.suggestedExerciseId) : null;
        const what = r.appliedSummary ?? (r.action === 'sustituir' ? `«${from}» → «${to}»` : r.action === 'series' ? `+${r.setsDelta ?? 1} serie en «${from}»` : `Añadir «${to}»`);
        return (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="label" color={colors.textDim}>
                {`${RULE[r.rule]} · ${r.decidedAt ? formatDateLong(toISODate(new Date(r.decidedAt))) : ''}`}
              </Txt>
              <Row gap={space.xs}>
                <Icon name={st?.icon ?? 'help'} size={16} color={st?.color ?? colors.textDim} />
                <Txt variant="label" color={st?.color ?? colors.textDim}>
                  {st?.label ?? r.status}
                </Txt>
              </Row>
            </Row>
            <Txt variant="bodyBold">{what}</Txt>
            <View>
              <Txt variant="small" color={colors.textDim}>
                {`Motivo: ${r.reason}`}
              </Txt>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
