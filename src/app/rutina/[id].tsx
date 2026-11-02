import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { resolveRest } from '@/domain/exerciseClassify';
import { fmtRest } from '@/domain/session';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import {
  addDay,
  addRoutineExercise,
  deleteDay,
  deleteRoutine,
  duplicateRoutine,
  moveDay,
  moveRoutineExercise,
  renameRoutine,
  routineWithDaysQuery,
  setActiveRoutine,
  updateDay,
  type RoutineWithDays,
} from '@/repositories/routines';
import { pickExercise } from '@/stores/picker';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { BigButton, Banner, Icon, IconButton, Screen, Txt } from '@/ui/components';
import { colors, fonts, radius, space } from '@/ui/theme';
import { showAlert } from '@/ui/alert';

type Day = RoutineWithDays['days'][number];

export default function RutinaEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const { data: r } = useAsyncQuery(`routine-${id}`, () => routineWithDaysQuery(db, Number(id)));
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState<string | null>(null);

  if (r === undefined || !profile) return null;
  if (!r) return null;

  const routineActions: SheetAction[] = [
    ...(!r.isActive ? [{ label: 'Usar como rutina activa', icon: 'check-circle-outline' as const, onPress: () => setActiveRoutine(db, r.id) }] : []),
    {
      label: 'Duplicar rutina',
      icon: 'content-copy',
      onPress: async () => {
        const nid = await duplicateRoutine(db, r.id);
        router.replace({ pathname: '/rutina/[id]', params: { id: nid } });
      },
    },
    {
      label: 'Eliminar rutina',
      icon: 'delete-outline',
      destructive: true,
      onPress: () =>
        showAlert('Eliminar rutina', `¿Eliminar «${r.name}»? El historial de entrenos se conserva.`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              await deleteRoutine(db, r.id);
              router.back();
            },
          },
        ]),
    },
  ];

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <IconButton name="dots-vertical" label="Opciones de la rutina" onPress={() => setMenu(true)} />,
        }}
      />
      <TextInput
        value={name ?? r.name}
        onChangeText={setName}
        onEndEditing={() => name != null && renameRoutine(db, r.id, name)}
        style={styles.title}
        cursorColor={colors.accentText}
        accessibilityLabel="Nombre de la rutina"
      />
      {r.isActive ? (
        <Txt variant="label" color={colors.accentText}>
          Rutina activa
        </Txt>
      ) : (
        <BigButton title="Usar como rutina activa" kind="secondary" icon="check-circle-outline" onPress={() => setActiveRoutine(db, r.id)} />
      )}

      {r.days.map((d, i) => (
        <DayBlock key={d.id} day={d} isFirst={i === 0} isLast={i === r.days.length - 1} profile={profile} />
      ))}

      <BigButton title="Añadir día" icon="plus" kind="ghost" onPress={() => addDay(db, r.id)} />
      <Banner kind="info">Toca un ejercicio para cambiar series, repeticiones, calentamientos, descanso o sustituirlo.</Banner>

      <ActionSheet visible={menu} title={r.name} actions={routineActions} onClose={() => setMenu(false)} />
    </Screen>
  );
}

function DayBlock({
  day,
  isFirst,
  isLast,
  profile,
}: {
  day: Day;
  isFirst: boolean;
  isLast: boolean;
  profile: NonNullable<ReturnType<typeof useProfile>>;
}) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(day.name);

  const actions: SheetAction[] = [
    { label: 'Renombrar día', icon: 'pencil-outline', onPress: () => setRenaming(true) },
    {
      label: day.isOptional ? 'Marcar como obligatorio' : 'Marcar como opcional',
      icon: 'star-half-full',
      onPress: () => updateDay(db, day.id, { isOptional: !day.isOptional }),
    },
    ...(!isFirst ? [{ label: 'Mover arriba', icon: 'arrow-up' as const, onPress: () => moveDay(db, day.id, -1) }] : []),
    ...(!isLast ? [{ label: 'Mover abajo', icon: 'arrow-down' as const, onPress: () => moveDay(db, day.id, 1) }] : []),
    {
      label: 'Eliminar día',
      icon: 'delete-outline',
      destructive: true,
      onPress: () =>
        showAlert('Eliminar día', `¿Eliminar «${day.name}» y sus ejercicios?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => deleteDay(db, day.id) },
        ]),
    },
  ];

  return (
    <View style={styles.day}>
      <View style={styles.dayHeader}>
        {renaming ? (
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            onEndEditing={() => {
              if (name.trim()) updateDay(db, day.id, { name: name.trim() });
              setRenaming(false);
            }}
            style={styles.dayInput}
            cursorColor={colors.accentText}
          />
        ) : (
          <Pressable style={{ flex: 1 }} onPress={() => setMenu(true)}>
            <Txt variant="displayS">{day.name}</Txt>
            {day.isOptional ? (
              <Txt variant="caption" color={colors.textDim}>
                Opcional (solo con 5 días/semana)
              </Txt>
            ) : null}
          </Pressable>
        )}
        <IconButton name="dots-vertical" label="Opciones del día" onPress={() => setMenu(true)} />
      </View>

      {day.exercises.map((e, j) => {
        const rest = resolveRest(e.exercise.kind, profile, e.exercise.defaultRestS, e.restS);
        const warm = e.warmupSets ? ` + ${e.warmupSets} cal.` : '';
        return (
          <View key={e.id} style={styles.exRow}>
            <Pressable
              style={({ pressed }) => [{ flex: 1, paddingVertical: space.sm, gap: 2 }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: '/rutina/ejercicio/[id]', params: { id: e.id } })}>
              <Txt variant="bodyBold">{e.exercise.nameEs}</Txt>
              <Txt variant="small" color={colors.textDim}>{`${e.sets} × ${e.repMin}-${e.repMax}${warm} · ${fmtRest(rest)}`}</Txt>
            </Pressable>
            <IconButton
              name="chevron-up"
              label="Subir ejercicio"
              color={j === 0 ? colors.border : colors.textDim}
              onPress={() => j > 0 && moveRoutineExercise(db, e.id, -1)}
            />
            <IconButton
              name="chevron-down"
              label="Bajar ejercicio"
              color={j === day.exercises.length - 1 ? colors.border : colors.textDim}
              onPress={() => j < day.exercises.length - 1 && moveRoutineExercise(db, e.id, 1)}
            />
          </View>
        );
      })}

      <Pressable
        onPress={() => pickExercise((exerciseId) => addRoutineExercise(db, day.id, exerciseId))}
        style={({ pressed }) => [styles.addEx, pressed && { backgroundColor: colors.surface2 }]}>
        <Icon name="plus" size={20} color={colors.accentText} />
        <Txt variant="button" color={colors.accentText}>
          Añadir ejercicio
        </Txt>
      </Pressable>
      {day.cardioNote ? (
        <Txt variant="small" color={colors.textDim}>
          {day.cardioNote}
        </Txt>
      ) : null}
      <ActionSheet visible={menu} title={day.name} actions={actions} onClose={() => setMenu(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.text,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.xs,
  },
  day: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.xs,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dayInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    height: 44,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addEx: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginTop: space.xs,
  },
});
