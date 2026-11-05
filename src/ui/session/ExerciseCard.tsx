import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import type { SetType } from '@/db/schema';
import { fmtRest } from '@/domain/session';
import { fmtNum } from '@/domain/format';
import { setBeatsRecord, sessionBests } from '@/domain/records';
import { usesPlates } from '@/domain/plates';
import { fmtRir, ROLE_LABELS } from '@/domain/setPlan';
import { formatSets, roundTo, type LastSet } from '@/domain/workout';
import type { LastPerformance, WorkoutDetail } from '@/repositories/workouts';
import {
  addSet,
  applyWeightDrop,
  deleteSet,
  toggleWorkoutSuperset,
  moveWorkoutExercise,
  removeWorkoutExercise,
  setWorkoutExerciseNotes,
  updateSet,
} from '@/repositories/workouts';

import { ActionSheet, type SheetAction } from '../ActionSheet';
import { Icon, IconButton, Row, Txt } from '../components';
import { PlateSheet } from '../PlateSheet';
import { colors, fonts, radius, space } from '../theme';

import { COLS, SetRow, type EffortMetric, type SetValues } from './SetRow';
import { showAlert } from '@/ui/alert';

type WE = WorkoutDetail['exercises'][number];

const SET_TYPE_LABEL: Record<SetType, string> = {
  calentamiento: 'C',
  normal: '',
  fallo: 'F',
  drop: 'D',
  backoff: 'B',
};

export function ExerciseCard({
  we,
  workoutId,
  last,
  bests,
  effort,
  isFirst,
  isLast,
  onToggleSet,
  onSubstitute,
  bar,
}: {
  we: WE;
  workoutId: number;
  last: LastPerformance | null | undefined;
  /** Mejores marcas previas a esta sesión (para marcar récords). */
  bests: { maxWeight: number | null; bestE1rm: number | null } | null | undefined;
  effort: EffortMetric;
  isFirst: boolean;
  isLast: boolean;
  onToggleSet: (we: WE, setId: number, wasCompleted: boolean, v: SetValues) => void;
  onSubstitute: (weId: number) => void;
  /** Barra y discos del perfil (calculadora de discos). */
  bar?: { barKg: number; plates: number[] | null };
}) {
  const [menu, setMenu] = useState(false);
  const [setMenuFor, setSetMenuFor] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(we.notes ?? '');
  const [plates, setPlates] = useState(false);

  const workingCount = we.sets.filter((s) => s.setType !== 'calentamiento' && s.setType !== 'drop').length;
  const target = we.sets.find((s) => s.setType === 'normal' && s.targetRir != null)?.targetRir ?? null;
  const nextKg = we.sets.find((s) => !s.completed && s.setType !== 'calentamiento')?.weightKg ?? we.sets.at(-1)?.weightKg ?? null;
  const inSuperset = we.supersetGroup != null;
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

  // Récords: cada serie se compara con lo mejor previo + lo hecho antes en esta sesión.
  const recordFlags = we.sets.map((s, i) => {
    if (!s.completed || s.setType === 'calentamiento') return false;
    const before = sessionBests(we.sets.slice(0, i).filter((x) => x.completed));
    const ref = bests
      ? {
          maxWeight: Math.max(bests.maxWeight ?? 0, before.maxWeight ?? 0) || null,
          bestE1rm: Math.max(bests.bestE1rm ?? 0, before.bestE1rm ?? 0) || null,
        }
      : null;
    return setBeatsRecord(s, ref).length > 0;
  });

  const exerciseActions: SheetAction[] = [
    { label: 'Ver ficha y técnica', icon: 'information-outline', onPress: () => router.push({ pathname: '/ejercicio/[id]', params: { id: we.exerciseId } }) },
    { label: we.notes ? 'Editar nota' : 'Añadir nota', icon: 'note-edit-outline', onPress: () => setEditingNotes(true) },
    { label: 'Sustituir ejercicio', icon: 'swap-horizontal', onPress: () => onSubstitute(we.id) },
    ...(usesPlates(we.exercise.equipment) && bar
      ? [{ label: 'Calculadora de discos', icon: 'weight-kilogram' as const, onPress: () => setPlates(true) }]
      : []),
    ...(!isLast || inSuperset
      ? [
          {
            label: inSuperset ? 'Quitar superserie' : 'Superserie con el siguiente',
            icon: 'link-variant' as const,
            onPress: () => toggleWorkoutSuperset(db, workoutId, we.id),
          },
        ]
      : []),
    ...(!isFirst ? [{ label: 'Mover arriba', icon: 'arrow-up' as const, onPress: () => moveWorkoutExercise(db, workoutId, we.id, -1) }] : []),
    ...(!isLast ? [{ label: 'Mover abajo', icon: 'arrow-down' as const, onPress: () => moveWorkoutExercise(db, workoutId, we.id, 1) }] : []),
    {
      label: 'Quitar de la sesión',
      icon: 'delete-outline',
      destructive: true,
      onPress: () =>
        showAlert('Quitar ejercicio', `¿Quitar «${we.exercise.nameEs}» y sus series de esta sesión?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Quitar', style: 'destructive', onPress: () => removeWorkoutExercise(db, we.id) },
        ]),
    },
  ];

  const setActions = (setId: number): SheetAction[] => [
    { label: 'Calentamiento', icon: 'fire', onPress: () => updateSet(db, setId, { setType: 'calentamiento' }) },
    { label: 'Serie normal', icon: 'numeric', onPress: () => updateSet(db, setId, { setType: 'normal' }) },
    { label: 'Al fallo', icon: 'flash', onPress: () => updateSet(db, setId, { setType: 'fallo' }) },
    { label: 'Drop set (sin descanso)', icon: 'arrow-down-bold', onPress: () => updateSet(db, setId, { setType: 'drop' }) },
    { label: 'Serie de descarga (tras la top)', icon: 'arrow-bottom-right', onPress: () => updateSet(db, setId, { setType: 'backoff' }) },
    { label: 'Eliminar serie', icon: 'delete-outline', destructive: true, onPress: () => deleteSet(db, setId) },
  ];

  return (
    <View style={[styles.card, allDone && { borderColor: colors.accent }, inSuperset && styles.superset]}>
      {inSuperset ? (
        <Row gap={space.xs} style={{ paddingLeft: space.sm }}>
          <Icon name="link-variant" size={16} color={colors.accentText} />
          <Txt variant="label" color={colors.accentText}>
            Superserie · sin descanso entre ejercicios
          </Txt>
        </Row>
      ) : null}
      <View style={styles.header}>
        <Pressable style={{ flex: 1, gap: 2 }} onPress={() => setMenu(true)}>
          <Txt variant="h3" color={allDone ? colors.accentText : colors.text}>
            {we.exercise.nameEs}
          </Txt>
          <Txt variant="small" color={colors.textDim}>
            {`${workingCount} × ${repHint ?? '—'} reps · descanso ${fmtRest(we.restS ?? 90)}`}
          </Txt>
          {we.role ? (
            <Txt variant="caption" color={colors.textFaint}>
              {`${ROLE_LABELS[we.role]}${target != null ? ` · RIR objetivo ${fmtRir(target)}` : ''}`}
            </Txt>
          ) : null}
        </Pressable>
        {we.planNote ? (
          <IconButton
            name="help-circle-outline"
            label="Por qué este esquema"
            color={colors.textDim}
            onPress={() => showAlert(we.exercise.nameEs, we.planNote ?? '')}
          />
        ) : null}
        <IconButton name="dots-vertical" label="Opciones del ejercicio" onPress={() => setMenu(true)} />
      </View>

      <ProgressionBadge we={we} onDrop={() => applyWeightDrop(db, we.id)} onSubstitute={() => onSubstitute(we.id)} />

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
          isRecord={recordFlags[i]}
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
      {bar ? <PlateSheet visible={plates} initialKg={nextKg} barKg={bar.barKg} plates={bar.plates} onClose={() => setPlates(false)} /> : null}
      <ActionSheet
        visible={setMenuFor != null}
        title="Tipo de serie"
        actions={setMenuFor != null ? setActions(setMenuFor) : []}
        onClose={() => setSetMenuFor(null)}
      />
    </View>
  );
}

const BADGES: Record<string, { text: (we: WE) => string; bg: string; fg: string }> = {
  subir: { text: (we) => `↑ +${fmtNum(we.progressionDeltaKg ?? 0, 2)} kg`, bg: colors.accent, fg: colors.onAccent },
  mantener: { text: () => '= Mantener peso', bg: colors.surface2, fg: colors.text },
  consolidar: { text: () => '= Consolidar', bg: colors.surface2, fg: colors.text },
  estancado: { text: () => 'Estancado', bg: colors.warningDim, fg: colors.warning },
  primera_vez: { text: () => 'Primera vez', bg: colors.surface2, fg: colors.textDim },
  lastre: { text: () => '+ Lastre', bg: colors.accent, fg: colors.onAccent },
  descarga: { text: () => 'Descarga', bg: colors.surface2, fg: colors.textDim },
};

function ProgressionBadge({ we, onDrop, onSubstitute }: { we: WE; onDrop: () => void; onSubstitute: () => void }) {
  const [open, setOpen] = useState(we.progressionAction === 'estancado');
  if (!we.progressionAction) return null;
  const b = BADGES[we.progressionAction];
  const alt = we.targetWeightKg != null ? roundTo(we.targetWeightKg * 0.9, 2.5) : null;
  return (
    <View style={{ gap: space.sm, paddingHorizontal: space.sm }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.badgeRow} accessibilityRole="button" accessibilityLabel="Ver sugerencia de progresión">
        <View style={[styles.badge, { backgroundColor: b.bg }]}>
          <Txt variant="label" color={b.fg}>
            {b.text(we)}
          </Txt>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textFaint} />
      </Pressable>
      {open && we.progressionNote ? (
        <Txt variant="small" color={colors.textDim}>
          {we.progressionNote}
        </Txt>
      ) : null}
      {open && we.progressionAction === 'estancado' ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pressable onPress={onDrop} style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.7 }]}>
            <Txt variant="smallBold">{alt != null ? `Bajar a ${fmtNum(alt, 2)} kg` : 'Bajar 10 %'}</Txt>
          </Pressable>
          <Pressable onPress={onSubstitute} style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.7 }]}>
            <Txt variant="smallBold">Cambiar ejercicio</Txt>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  superset: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' },
  badge: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm },
  smallBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
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
