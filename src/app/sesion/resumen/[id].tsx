import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { formatSets, summarizeSets } from '@/domain/workout';
import { useAsyncQuery } from '@/hooks/useDb';
import { discardWorkout, updateWorkoutNotes, workoutDetailQuery } from '@/repositories/workouts';
import { BigButton, Card, Field, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Resumen() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const { data: w } = useAsyncQuery(`workout-${id}`, () => workoutDetailQuery(db, Number(id)));
  const [notes, setNotes] = useState<string | null>(null);
  if (!w) return null;

  const allSets = w.exercises.flatMap((e) => e.sets);
  const sum = summarizeSets(allSets);
  const duration = w.endedAt ? (w.endedAt - w.startedAt) / 1000 : 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: nuevo ? '¡Entreno guardado!' : 'Entreno' }} />
      <View>
        <Txt variant="h1">{w.name}</Txt>
        <Txt color={colors.textDim}>{formatDateLong(w.date)}</Txt>
      </View>
      <Card style={{ borderColor: colors.accent }}>
        <Row align="flex-start">
          <Stat label="Duración" value={fmtDuration(duration)} />
          <Stat label="Series" value={String(sum.workingSets)} />
        </Row>
        <Row align="flex-start">
          <Stat label="Volumen" value={`${fmtNum(sum.volumeKg, 0)} kg`} color={colors.accentText} />
          <Stat label="Repeticiones" value={String(sum.reps)} />
        </Row>
      </Card>
      <Txt variant="small" color={colors.textFaint}>
        Los récords personales y las sugerencias de progresión aparecerán aquí a partir de la fase 4.
      </Txt>

      <SectionTitle>Ejercicios</SectionTitle>
      {w.exercises.map((we) => {
        const working = we.sets.filter((s) => s.setType !== 'calentamiento' && s.completed);
        return (
          <Card key={we.id}>
            <Txt variant="h3">{we.exercise.nameEs}</Txt>
            <Txt color={colors.textDim}>{working.length ? formatSets(working) : 'Solo calentamiento'}</Txt>
            {we.notes ? (
              <Txt variant="small" color={colors.warning}>
                {we.notes}
              </Txt>
            ) : null}
          </Card>
        );
      })}

      <SectionTitle>Notas del entreno</SectionTitle>
      <Field
        label="¿Cómo te has sentido?"
        multiline
        value={notes ?? w.notes ?? ''}
        onChangeText={setNotes}
        onEndEditing={() => notes != null && updateWorkoutNotes(db, w.id, notes)}
        placeholder="Energía, sueño, molestias…"
      />

      <View style={{ gap: space.md }}>
        <BigButton title="Listo" icon="check" onPress={() => router.dismissTo('/entrenar')} />
        <BigButton
          title="Borrar entreno"
          kind="ghost"
          icon="delete-outline"
          onPress={() =>
            Alert.alert('Borrar entreno', 'Se borrará del historial. No se puede deshacer.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Borrar',
                style: 'destructive',
                onPress: async () => {
                  await discardWorkout(db, w.id);
                  router.dismissTo('/entrenar');
                },
              },
            ])
          }
        />
      </View>
    </Screen>
  );
}
