import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { WorkoutSet } from '@/db/schema';
import { fmtNum, parseDecimal } from '@/domain/format';
import type { LastSet } from '@/domain/workout';

import { Txt } from '../components';
import { colors, fonts, radius, space } from '../theme';

export type EffortMetric = 'rir' | 'rpe' | 'ninguno';

export interface SetValues {
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
}

const str = (n: number | null | undefined) => (n == null ? '' : fmtNum(n, 2));

function signature(s: WorkoutSet) {
  return `${s.weightKg}|${s.reps}|${s.rir}|${s.rpe}|${s.completed}`;
}

export const COLS = { label: 44, kg: 76, reps: 60, effort: 50, check: 52 } as const;

export function SetRow({
  set,
  label,
  prev,
  effort,
  repHint,
  onLabelPress,
  onCommit,
  onToggle,
}: {
  set: WorkoutSet;
  label: string;
  prev?: LastSet;
  effort: EffortMetric;
  repHint?: string;
  onLabelPress: () => void;
  onCommit: (v: Partial<SetValues>) => void;
  onToggle: (v: SetValues) => void;
}) {
  const [kg, setKg] = useState(str(set.weightKg));
  const [reps, setReps] = useState(str(set.reps));
  const [eff, setEff] = useState(str(effort === 'rpe' ? set.rpe : set.rir));
  // Re-sincroniza si los datos cambian desde fuera (p. ej. al sustituir el ejercicio).
  const [sig, setSig] = useState(signature(set));
  if (sig !== signature(set)) {
    setSig(signature(set));
    setKg(str(set.weightKg));
    setReps(str(set.reps));
    setEff(str(effort === 'rpe' ? set.rpe : set.rir));
  }

  const values = (): SetValues => {
    const e = parseDecimal(eff);
    return {
      weightKg: parseDecimal(kg),
      reps: parseDecimal(reps) == null ? null : Math.round(parseDecimal(reps)!),
      rir: effort === 'rir' ? e : set.rir,
      rpe: effort === 'rpe' ? e : set.rpe,
    };
  };

  const commitIfChanged = () => {
    const v = values();
    if (v.weightKg !== set.weightKg || v.reps !== set.reps || v.rir !== set.rir || v.rpe !== set.rpe) onCommit(v);
  };

  const done = set.completed;
  const warm = set.setType === 'calentamiento';
  const prevText = prev ? (prev.weightKg ? `${fmtNum(prev.weightKg, 2)}×${prev.reps ?? '—'}` : `×${prev.reps ?? '—'}`) : '—';

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <Pressable onPress={onLabelPress} hitSlop={6} style={styles.labelCell} accessibilityLabel={`Opciones de la serie ${label}`}>
        <Txt variant="displayS" color={warm ? colors.warning : set.setType === 'normal' ? colors.text : colors.accentText}>
          {label}
        </Txt>
      </Pressable>
      <Txt variant="small" color={colors.textFaint} style={styles.prev} numberOfLines={1}>
        {prevText}
      </Txt>
      <TextInput
        value={kg}
        onChangeText={setKg}
        onEndEditing={commitIfChanged}
        keyboardType="decimal-pad"
        placeholder="kg"
        placeholderTextColor={colors.textFaint}
        selectTextOnFocus
        cursorColor={colors.accentText}
        style={[styles.input, { width: COLS.kg }]}
      />
      <TextInput
        value={reps}
        onChangeText={setReps}
        onEndEditing={commitIfChanged}
        keyboardType="number-pad"
        placeholder={repHint ?? 'reps'}
        placeholderTextColor={colors.textFaint}
        selectTextOnFocus
        cursorColor={colors.accentText}
        style={[styles.input, { width: COLS.reps }]}
      />
      {effort !== 'ninguno' ? (
        <TextInput
          value={eff}
          onChangeText={setEff}
          onEndEditing={commitIfChanged}
          keyboardType="decimal-pad"
          placeholder={effort === 'rir' ? 'RIR' : 'RPE'}
          placeholderTextColor={colors.textFaint}
          selectTextOnFocus
          cursorColor={colors.accentText}
          style={[styles.input, styles.effort, { width: COLS.effort }]}
        />
      ) : null}
      <Pressable
        onPress={() => onToggle(values())}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Marcar serie como pendiente' : 'Completar serie'}
        hitSlop={4}
        style={({ pressed }) => [styles.check, done && styles.checkDone, pressed && { opacity: 0.7 }]}>
        <MaterialCommunityIcons name="check-bold" size={26} color={done ? colors.onAccent : colors.textFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  rowDone: { backgroundColor: colors.accentDim },
  labelCell: { width: COLS.label, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  prev: { flex: 1, textAlign: 'center' },
  input: {
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    color: colors.text,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 26,
    paddingVertical: 0,
  },
  effort: { fontSize: 20 },
  check: {
    width: COLS.check,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.accent },
});
