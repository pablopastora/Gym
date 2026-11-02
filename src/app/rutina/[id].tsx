import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { db } from '@/db/client';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { routineWithDaysQuery } from '@/repositories/routines';
import { Card, ListRow, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function RutinaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const { data: r } = useAsyncQuery(`routine-${id}`, () => routineWithDaysQuery(db, Number(id)));
  if (!r || !profile) return null;
  return (
    <Screen>
      <Stack.Screen options={{ title: r.name }} />
      {r.days.map((d) => (
        <View key={d.id} style={{ gap: 8 }}>
          <SectionTitle>{d.name + (d.isOptional ? ' (opcional)' : '')}</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            {d.exercises.map((e) => {
              const rest = resolveRest(e.exercise.kind, profile, e.exercise.defaultRestS, e.restS);
              const warm = e.warmupSets ? ` + ${e.warmupSets} calent.` : '';
              return (
                <ListRow
                  key={e.id}
                  title={e.exercise.nameEs}
                  subtitle={`${e.sets} × ${e.repMin}-${e.repMax} reps${warm} · descanso ${fmtRest(rest)}`}
                  onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: e.exerciseId } })}
                />
              );
            })}
          </Card>
          {d.cardioNote ? (
            <Txt variant="small" color={colors.warning}>
              {d.cardioNote}
            </Txt>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
