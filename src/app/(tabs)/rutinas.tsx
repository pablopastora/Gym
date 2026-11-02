import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { View } from 'react-native';

import { db } from '@/db/client';
import { routine } from '@/db/schema';
import { createRoutine } from '@/repositories/routines';
import { BigButton, Card, Row, Screen, Txt } from '@/ui/components';
import { colors, radius } from '@/ui/theme';

export default function Rutinas() {
  const { data } = useLiveQuery(db.select().from(routine).orderBy(asc(routine.sortOrder), asc(routine.id)));

  const nueva = async () => {
    const id = await createRoutine(db, 'Nueva rutina');
    router.push({ pathname: '/rutina/[id]', params: { id } });
  };

  return (
    <Screen>
      {(data ?? []).map((r) => (
        <Card
          key={r.id}
          onPress={() => router.push({ pathname: '/rutina/[id]', params: { id: r.id } })}
          style={r.isActive ? { borderColor: colors.accent, borderWidth: 1 } : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              {r.name}
            </Txt>
            {r.isActive ? (
              <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm }}>
                <Txt variant="label" color={colors.onAccent}>
                  Activa
                </Txt>
              </View>
            ) : null}
          </Row>
          {r.notes ? (
            <Txt variant="small" color={colors.textDim}>
              {r.notes}
            </Txt>
          ) : null}
        </Card>
      ))}
      <BigButton title="Nueva rutina" icon="plus" kind="secondary" onPress={nueva} />
    </Screen>
  );
}
