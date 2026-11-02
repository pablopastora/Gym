import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import type { SetType } from '@/db/schema';
import { fmtRest } from '@/domain/session';
import { formatSets, type LastSet } from '@/domain/workout';
import type { LastPerformance, WorkoutDetail } from '@/repositories/workouts';
import {
  addSet,
  deleteSet,
  moveWorkoutExercise,
  removeWorkoutExercise,
  setWorkoutExerciseNotes,
  updateSet,
} from '@/repositories/workouts';

import { ActionSheet, type SheetAction } from '../ActionSheet';
import { Icon, IconButton, Txt } from '../components';
import { colors, fonts, radius, space } from '../theme';

import { COLS, SetRow, type EffortMetric, type SetValues } from './SetRow';

type WE = WorkoutDetail['exercises'][number];

const SET_TYPE_LABEL: Record<SetType, string> = {
  calentamiento: 'C',
  normal: '',
  fallo: 'F',
  drop: 'D',
};

export function ExerciseCard({
  we,
  workoutId,
  last,
  effort,
  isFirst,
  isLast,
  onToggleSet,
  onSubstitute,
}: {
  we: WE;
  workoutId: number;
  last: LastPerformance | null | undefined;
  effort: EffortMetric;
  isFirst: boolean;
  isLast: boolean;
  onToggleSet: (we: WE, setId: number, wasCompleted: boolean, v: SetValues) => void;
  onSubstitute: (weId: number) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [setMenuFor, setSetMenuFor] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(we.notes ?? '');

  const workingCount = we.sets.filter((s) => s.setType !== 'calentamiento').length;
  const allDone = we.sets.length > 0 && we.sets.every((s) => s.completed);
  const repHint = we.repMin != null && we.repMax != null ? `${we.repMin}-${we.repMax}` : undefined;

  let n = 0;
  const labels = we.sets.map((s) => (s.setType === 'calentamiento' ? 'C' : `${++n}${SET_TYPE_LABEL[s.setType]}`));
  let wi = -1;
  const prevFor = we.sets.map((s): LastSet | undefined => {
    if (s.setType === 'calentamiento' || !last?.sets.length) return undefined;
    wi++;
    return last.sets[Math.min(wi, last.sets.length - 1)];
  });

  const exerciseActions: SheetAction[] = [
    { label: 'Ver ficha y técnica', icon: 'information-outline', onPress: () => router.push({ pathname: '/ejercicio/[id]', params: { id: we.exerciseId } }) },
    { label: we.notes ? 'Editar nota' : 'Añadir nota', icon: 'note-edit-outline', onPress: () => setEditingNotes(true) },
    { label: 'Sustituir ejercicio', icon: 'swap-horizontal', onPress: () => onSubstitute(we.id) },
    ...(!isFirst ? [{ label: 'Mover arriba', icon: 'arrow-up' as const, onPress: () => moveWorkoutExercise(db, workoutId, we.id, -1) }] : []),
    ...(!isLast ? [{ label: 'Mover abajo', icon: 'arrow-down' as const, onPress: () => moveWorkoutExercise(db, workoutId, we.id, 1) }] : []),
    {
      label: 'Quitar de la sesión',
      icon: 'delete-outline',
      destructive: true,
      onPress: () =>
        Alert.alert('Quitar ejercicio', `¿Quitar «${we.exercise.nameEs}» y sus series de esta sesión?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Quitar', style: 'destructive', onPress: () => removeWorkoutExercise(db, we.id) },
        ]),
    },
  ];

  const setActions = (setId: number): SheetAction[] => [
    { label: 'Calentamiento', icon: 'fire', onPress: () => updateSet(db, setId, { setType: 'calentamiento' }) },
    { label: 'Serie normal', icon: 'numeric', onPress: () => updateSet(db, setId, { setType: 'normal' }) },
    { label: 'Al fallo', icon: 'flash', onPress: () => updateSet(db, setId, { setType: 'fallo' }) },
    { label: 'Drop set', icon: 'arrow-down-bold', onPress: () => updateSet(db, setId, { setType: 'drop' }) },
    { label: 'Eliminar serie', icon: 'delete-outline', destructive: true, onPress: () => deleteSet(db, setId) },
  ];

  return (
    <View style={[styles.card, allDone && { borderColor: colors.accent }]}>
      <View style={styles.header}>
        <Pressable style={{ flex: 1, gap: 2 }} onPress={() => setMenu(true)}>
          <Txt variant="h3" color={allDone ? colors.accentText : colors.text}>
            {we.exercise.nameEs}
          </Txt>
          <Txt variant="small" color={colors.textDim}>
            {`${workingCount} × ${repHint ?? '—'} reps · descanso ${fmtRest(we.restS ?? 90)}`}
          </Txt>
        </Pressable>
        <IconButton name="dots-vertical" label="Opciones del ejercicio" onPress={() => setMenu(true)} />
      </View>

      <View style={styles.last}>
        <Icon name="history" size={16} color={colors.textFaint} />
        <Txt variant="small" color={colors.textDim} style={{ flex: 1 }} numberOfLines={2}>
          {last ? `Última vez: ${formatSets(last.sets)}` : 'Primera vez con este ejercicio'}
        </Txt>
      </View>

      {editingNotes ? (
        <View style={{ gap: space.sm }}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Nota del ejercicio (agarre, ajuste de máquina, sensaciones…)"
            placeholderTextColor={colors.textFaint}
            multiline
            autoFocus
            cursorColor={colors.accentText}
            style={styles.notesInput}
            onBlur={() => {
              setWorkoutExerciseNotes(db, we.id, notes);
              setEditingNotes(false);
            }}
          />
        </View>
      ) : we.notes ? (
        <Pressable onPress={() => setEditingNotes(true)} style={styles.note}>
          <Icon name="note-text-outline" size={16} color={colors.warning} />
          <Txt variant="small" style={{ flex: 1 }}>
            {we.notes}
          </Txt>
        </Pressable>
      ) : null}

      <View style={styles.colHeader}>
        <Txt variant="colLabel" color={colors.textFaint} style={{ width: COLS.label, textAlign: 'center' }}>
          Serie
        </Txt>
        <Txt variant="colLabel" color={colors.textFaint} style={{ flex: 1, textAlign: 'center' }}>
          Anterior
        </Txt>
        <Txt variant="colLabel" color={colors.textFaint} style={{ width: COLS.kg, textAlign: 'center' }}>
          Kg
        </Txt>
        <Txt variant="colLabel" color={colors.textFaint} style={{ width: COLS.reps, textAlign: 'center' }}>
          Reps
        </Txt>
        {effort !== 'ninguno' ? (
          <Txt variant="colLabel" color={colors.textFaint} style={{ width: COLS.effort, textAlign: 'center' }}>
            {effort.toUpperCase()}
          </Txt>
        ) : null}
        <View style={{ width: COLS.check }} />
      </View>

      {we.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          label={labels[i]}
          prev={prevFor[i]}
          effort={effort}
          repHint={s.setType === 'calentamiento' ? undefined : repHint}
          onLabelPress={() => setSetMenuFor(s.id)}
          onCommit={(v) => updateSet(db, s.id, v)}
          onToggle={(v) => onToggleSet(we, s.id, s.completed, v)}
        />
      ))}

      <Pressable onPress={() => addSet(db, we.id)} style={({ pressed }) => [styles.addSet, pressed && { backgroundColor: colors.surface2 }]}>
        <Icon name="plus" size={20} color={colors.textDim} />
        <Txt variant="button" color={colors.textDim}>
          Añadir serie
        </Txt>
      </Pressable>

      <ActionSheet visible={menu} title={we.exercise.nameEs} actions={exerciseActions} onClose={() => setMenu(false)} />
      <ActionSheet
        visible={setMenuFor != null}
        title="Tipo de serie"
        actions={setMenuFor != null ? setActions(setMenuFor) : []}
        onClose={() => setSetMenuFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingLeft: space.sm },
  last: { flexDirection: 'row', gap: space.xs, alignItems: 'center', paddingHorizontal: space.sm },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningDim,
  },
  notesInput: {
    marginHorizontal: space.sm,
    minHeight: 64,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    color: colors.text,
    padding: space.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, marginTop: space.xs },
  addSet: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.sm,
    marginHorizontal: space.sm,
  },
});
