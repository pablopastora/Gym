import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Profile } from '@/db/schema';
import { formatDateShort } from '@/domain/dates';
import { resolveRest } from '@/domain/exerciseClassify';
import { estimateSessionMinutes, fmtRest } from '@/domain/session';
import type { PlanDay, PlanStatus } from '@/domain/weekPlan';
import type { PlanRoutineDay } from '@/repositories/plan';

import { BigButton, Icon, Row, Txt, type IconName } from './components';
import { colors, radius, space } from './theme';

export const STATUS_INFO: Record<PlanStatus, { label: string; icon: IconName; color: string }> = {
  completado: { label: 'Completado', icon: 'check-circle', color: colors.accentText },
  pendiente: { label: 'Toca hoy', icon: 'play-circle-outline', color: colors.text },
  programado: { label: 'Programado', icon: 'calendar-clock', color: colors.textDim },
  descanso: { label: 'Descanso', icon: 'sleep', color: colors.textFaint },
  perdido: { label: 'No entrenado', icon: 'close-circle-outline', color: colors.textFaint },
};

/** Ejercicios de una sesión: series × reps y descanso. */
export function SessionPreview({ day, profile }: { day: PlanRoutineDay; profile: Profile }) {
  return (
    <View style={{ gap: 6 }}>
      {day.exercises.map((e) => (
        <Pressable
          key={e.id}
          onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: e.exerciseId } })}
          style={({ pressed }) => [styles.exRow, pressed && { opacity: 0.7 }]}>
          <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
            {e.exercise.nameEs}
          </Txt>
          <Txt variant="smallBold" color={colors.textDim}>
            {`${e.sets} × ${e.repMin}-${e.repMax}`}
          </Txt>
          <Txt variant="caption" color={colors.textFaint} style={{ width: 56, textAlign: 'right' }}>
            {fmtRest(resolveRest(e.exercise.kind, profile, e.exercise.defaultRestS, e.restS))}
          </Txt>
        </Pressable>
      ))}
      {day.cardioNote ? (
        <Txt variant="caption" color={colors.textDim}>
          {day.cardioNote}
        </Txt>
      ) : null}
    </View>
  );
}

export function sessionMinutes(day: PlanRoutineDay, profile: Profile) {
  return estimateSessionMinutes(
    day.exercises.map((e) => ({ sets: e.sets, warmupSets: e.warmupSets, restS: resolveRest(e.exercise.kind, profile, e.exercise.defaultRestS, e.restS) })),
  );
}

/**
 * Tarjeta de un día del plan semanal. El de hoy se resalta en rojo; los futuros se
 * muestran apagados y con su etiqueta (Mañana, Jueves…) para no confundirlos.
 */
export function PlanDayCard({
  entry,
  profile,
  onStart,
  onAdvance,
}: {
  entry: PlanDay<PlanRoutineDay>;
  profile: Profile;
  onStart?: () => void;
  onAdvance?: () => void;
}) {
  const [open, setOpen] = useState(entry.isToday);
  const info = STATUS_INFO[entry.status];
  const session = entry.session;
  const isTodayPending = entry.isToday && entry.status === 'pendiente';
  return (
    <View
      style={[
        styles.card,
        entry.isToday && { borderColor: colors.accent, borderWidth: 1.5 },
        (entry.status === 'descanso' || entry.status === 'perdido') && { opacity: 0.75 },
      ]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant={entry.isToday ? 'h2' : 'displayS'} color={entry.isToday ? colors.text : colors.textDim}>
            {entry.label}
          </Txt>
          <Txt variant="caption" color={colors.textFaint}>
            {formatDateShort(entry.date)}
          </Txt>
        </View>
        <Row gap={space.xs}>
          <Icon name={info.icon} size={18} color={info.color} />
          <Txt variant="label" color={info.color}>
            {info.label}
          </Txt>
        </Row>
      </Row>

      {entry.status === 'completado'
        ? entry.workouts.map((w) => (
            <Row key={w.id} style={{ justifyContent: 'space-between' }}>
              <Txt variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                {w.name}
              </Txt>
              <Pressable onPress={() => router.push({ pathname: '/sesion/resumen/[id]', params: { id: w.id } })} hitSlop={8} style={styles.link}>
                <Txt variant="smallBold" color={colors.accentText}>
                  Ver
                </Txt>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: '/sesion/editar/[id]', params: { id: w.id } })} hitSlop={8} style={styles.link}>
                <Txt variant="smallBold" color={colors.textDim}>
                  Editar
                </Txt>
              </Pressable>
            </Row>
          ))
        : null}

      {session ? (
        <>
          <Pressable onPress={() => setOpen(!open)} style={styles.sessionHead} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Txt variant="bodyBold">{session.name}</Txt>
              <Txt variant="caption" color={colors.textFaint}>
                {`${session.exercises.length} ejercicios · ~${sessionMinutes(session, profile)} min`}
              </Txt>
            </View>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} color={colors.textFaint} />
          </Pressable>
          {open ? <SessionPreview day={session} profile={profile} /> : null}
          {isTodayPending && onStart ? <BigButton title="Empezar entrenamiento" icon="play" onPress={onStart} /> : null}
          {!entry.isToday && onAdvance ? <BigButton title="Adelantar a hoy" icon="fast-forward" kind="ghost" onPress={onAdvance} /> : null}
        </>
      ) : entry.status === 'descanso' && !entry.workouts.length ? (
        <Txt variant="small" color={colors.textFaint}>
          Día de descanso.
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 28 },
  link: { paddingHorizontal: space.sm, minHeight: 36, justifyContent: 'center' },
});
