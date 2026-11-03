import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { formatDateLong } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { RECORD_LABELS } from '@/domain/records';
import { KCAL_EXPLANATION, STRENGTH_LEVEL_LABEL, type StrengthLevel } from '@/domain/kcal';
import { formatSets, summarizeSets } from '@/domain/workout';
import { cardioSession } from '@/db/schema';
import { useAsyncQuery } from '@/hooks/useDb';
import { recordsInWorkout } from '@/repositories/progress';
import { discardWorkout, updateWorkoutNotes, workoutDetailQuery } from '@/repositories/workouts';
import { BigButton, Card, Field, Icon, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

export default function Resumen() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const { data: w } = useAsyncQuery(`workout-${id}`, () => workoutDetailQuery(db, Number(id)));
  const { data: recs } = useAsyncQuery(`records-${id}`, () => recordsInWorkout(db, Number(id)));
  const { data: linkedCardio } = useLiveQuery(db.select().from(cardioSession).where(eq(cardioSession.workoutId, Number(id))), [id]);
  const [notes, setNotes] = useState<string | null>(null);
  if (!w) return null;
  const level: StrengthLevel | null = w.met == null ? null : w.met >= 6 ? 'intenso' : w.met <= 3.5 ? 'ligero' : 'moderado';
  const cardioKcal = (linkedCardio ?? []).reduce((a, c) => a + (c.kcal ?? 0), 0);
  const totalKcal = (w.kcal ?? 0) + cardioKcal;

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
        {w.kcal != null ? (
          <Row align="flex-start">
            <View style={{ flex: 1 }}>
              <Row gap={space.xs}>
                <Txt variant="label" color={colors.textDim}>
                  Kcal estimadas
                </Txt>
                <Pressable
                  onPress={() => showAlert('¿Cómo se calculan las kcal?', KCAL_EXPLANATION)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Cómo se calculan las kcal">
                  <Icon name="information-outline" size={18} color={colors.textDim} />
                </Pressable>
              </Row>
              <Txt variant="display">{`~${fmtNum(totalKcal, 0)}`}</Txt>
              <Txt variant="caption" color={colors.textFaint}>
                {`aprox. ±25 %${level ? ` · intensidad ${STRENGTH_LEVEL_LABEL[level]} (MET ${fmtNum(w.met!, 1)})` : ''}${cardioKcal ? ` · incluye ${fmtNum(cardioKcal, 0)} de cardio` : ''}`}
              </Txt>
            </View>
          </Row>
        ) : null}
      </Card>
      {recs?.length ? (
        <Card style={{ backgroundColor: colors.accentDim, borderColor: colors.accent }}>
          <Row gap={space.sm}>
            <Icon name="trophy" color={colors.accentText} size={28} />
            <Txt variant="h2">{recs.length === 1 ? '¡1 récord personal!' : `¡${recs.length} récords personales!`}</Txt>
          </Row>
          {recs.map((r) => {
            const we = w.exercises.find((e) => e.exerciseId === r.exerciseId);
            return (
              <Txt key={r.exerciseId}>
                {`${we?.exercise.nameEs ?? r.exerciseId}: ${r.types.map((t) => RECORD_LABELS[t].toLowerCase()).join(', ')}`}
              </Txt>
            );
          })}
        </Card>
      ) : null}

      <SectionTitle>Ejercicios</SectionTitle>
      {w.exercises.map((we) => {
        const working = we.sets.filter((s) => s.setType !== 'calentamiento' && s.completed);
        return (
          <Card key={we.id} onPress={() => router.push({ pathname: '/ejercicio/historial/[id]', params: { id: we.exerciseId } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="h3" style={{ flex: 1 }}>
                {we.exercise.nameEs}
              </Txt>
              {recs?.some((r) => r.exerciseId === we.exerciseId) ? <Icon name="trophy" color={colors.accentText} size={20} /> : null}
            </Row>
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
          title="Editar entreno"
          icon="pencil-outline"
          kind="secondary"
          onPress={() => router.push({ pathname: '/sesion/editar/[id]', params: { id: w.id } })}
        />
        <BigButton
          title="Borrar entreno"
          kind="ghost"
          icon="delete-outline"
          onPress={() =>
            showAlert('Borrar entreno', 'Se borrará del historial. No se puede deshacer.', [
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
