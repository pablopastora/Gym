import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';

import { db } from '@/db/client';
import { routine } from '@/db/schema';
import { Banner, Card, Row, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function Rutinas() {
  const { data } = useLiveQuery(db.select().from(routine).orderBy(asc(routine.sortOrder), asc(routine.id)));
  return (
    <Screen>
      {(data ?? []).map((r) => (
        <Card key={r.id} onPress={() => router.push({ pathname: '/rutina/[id]', params: { id: r.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" style={{ flex: 1 }}>
              {r.name}
            </Txt>
            {r.isActive ? (
              <Txt variant="caption" color={colors.success}>
                ACTIVA
              </Txt>
            ) : null}
          </Row>
          {r.notes ? (
            <Txt variant="small" color={colors.textDim}>
              {r.notes}
            </Txt>
          ) : null}
        </Card>
      ))}
      <Banner kind="info">Crear, editar, reordenar y sustituir ejercicios llega en la fase 3.</Banner>
    </Screen>
  );
}
