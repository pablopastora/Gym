import { inArray } from 'drizzle-orm';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { db } from '@/db/client';
import { exercise, routineDay, type RoutineSuggestion } from '@/db/schema';
import { GROUP_LABELS } from '@/domain/adapt';
import { useAsyncQuery } from '@/hooks/useDb';
import { acceptSuggestion, ensureWeeklySuggestions, pendingSuggestionsQuery, rejectSuggestion } from '@/repositories/adapt';

import { showAlert } from './alert';
import { BigButton, Card, Icon, Row, SectionTitle, Txt } from './components';
import { colors, radius, space } from './theme';

const RULE_LABEL = { refuerzo: 'Refuerzo', avance: 'Avance', equilibrio: 'Equilibrio' } as const;

/**
 * «Sugerencia de la semana»: se generan la primera vez que se abre la app cada
 * semana. Nada cambia hasta pulsar «Aceptar».
 */
export function WeeklySuggestions({ today }: { today: string }) {
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    ensureWeeklySuggestions(db, today)
      .catch(() => 0)
      .finally(() => alive && setGeneratedFor(today));
    return () => {
      alive = false;
    };
  }, [today]);

  const { data } = useAsyncQuery(`suggestions-${generatedFor}`, async () => {
    const pending = await pendingSuggestionsQuery(db);
    const ids = [...new Set(pending.flatMap((p) => [p.exerciseId, p.suggestedExerciseId]).filter((x): x is string => !!x))];
    const names = ids.length ? await db.select({ id: exercise.id, n: exercise.nameEs }).from(exercise).where(inArray(exercise.id, ids)) : [];
    const dayIds = [...new Set(pending.map((p) => p.routineDayId).filter((x): x is number => x != null))];
    const days = dayIds.length ? await db.select({ id: routineDay.id, n: routineDay.name }).from(routineDay).where(inArray(routineDay.id, dayIds)) : [];
    return { pending, names: new Map(names.map((x) => [x.id, x.n])), days: new Map(days.map((x) => [x.id, x.n])) };
  });
  if (!data?.pending.length) return null;

  const title = (s: RoutineSuggestion) => {
    const from = s.exerciseId ? data.names.get(s.exerciseId) : null;
    const to = s.suggestedExerciseId ? data.names.get(s.suggestedExerciseId) : null;
    if (s.action === 'sustituir') return `Cambiar «${from}» por «${to}»`;
    if (s.action === 'series') return `+${s.setsDelta ?? 1} serie en «${from}»`;
    return `Añadir «${to}»${s.muscle ? ` (${GROUP_LABELS[s.muscle]?.toLowerCase() ?? s.muscle})` : ''}`;
  };

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle
        right={
          <Pressable onPress={() => router.push('/rutina/cambios')} hitSlop={8}>
            <Txt variant="caption" color={colors.textDim}>
              Historial ›
            </Txt>
          </Pressable>
        }>
        {data.pending.length === 1 ? 'Sugerencia de la semana' : 'Sugerencias de la semana'}
      </SectionTitle>
      {data.pending.map((s) => (
        <Card key={s.id} style={{ borderColor: colors.border }}>
          <Row gap={space.sm}>
            <View style={{ backgroundColor: colors.surface2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm }}>
              <Txt variant="label" color={colors.accentText}>
                {RULE_LABEL[s.rule]}
              </Txt>
            </View>
            {s.routineDayId != null ? (
              <Txt variant="caption" color={colors.textFaint} numberOfLines={1} style={{ flex: 1 }}>
                {data.days.get(s.routineDayId)}
              </Txt>
            ) : null}
          </Row>
          <Txt variant="h3">{title(s)}</Txt>
          <Txt variant="small" color={colors.textDim}>
            {s.reason}
          </Txt>
          <Row gap={space.sm}>
            <BigButton
              title="Aceptar"
              icon="check"
              style={{ flex: 1, paddingHorizontal: space.sm }}
              onPress={async () => {
                const ok = await acceptSuggestion(db, s.id);
                if (!ok) showAlert('Ya no aplica', 'La rutina ha cambiado desde que se generó esta sugerencia.');
              }}
            />
            <BigButton title="Rechazar" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => rejectSuggestion(db, s.id)} />
          </Row>
          <Pressable
            onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: (s.suggestedExerciseId ?? s.exerciseId)! } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 36 }}
            accessibilityRole="button">
            <Icon name="information-outline" size={18} color={colors.textDim} />
            <Txt variant="smallBold" color={colors.textDim}>
              Ver ejercicio
            </Txt>
          </Pressable>
        </Card>
      ))}
      <Txt variant="caption" color={colors.textFaint}>
        Si aceptas, se aplica a las próximas sesiones. Si rechazas, no se repetirá en 4 semanas. Los básicos (banca, sentadilla, peso
        muerto, dominadas/remo, press militar) nunca se cambian.
      </Txt>
    </View>
  );
}
