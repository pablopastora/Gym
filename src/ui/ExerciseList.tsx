import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EQUIPMENT_LABELS, equipmentLabel, muscleLabel } from '@/data/labels';
import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { matchesQuery, MUSCLE_GROUPS } from '@/domain/search';
import { exerciseThumbUri } from '@/services/exerciseMedia';

import { Chip, Icon, Txt } from './components';
import { colors, fonts, radius, space } from './theme';

const FAV = '__fav';
const MINE = '__mine';

/** Orden del filtro de equipamiento (los más habituales primero). */
const EQUIPMENT_FILTER = ['barbell', 'dumbbell', 'cable', 'machine', 'body only', 'e-z curl bar', 'kettlebells', 'bands', 'other'];

/** Buscador + filtros (músculo, equipamiento, favoritos, propios) + lista (biblioteca y selector). */
export function ExerciseList({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate?: () => void }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const { data } = useLiveQuery(
    db
      .select({
        id: exercise.id,
        nameEs: exercise.nameEs,
        nameEn: exercise.nameEn,
        primaryMuscles: exercise.primaryMuscles,
        equipment: exercise.equipment,
        images: exercise.images,
        isFavorite: exercise.isFavorite,
        curated: exercise.curated,
        isCustom: exercise.isCustom,
        customPhotoFile: exercise.customPhotoFile,
      })
      .from(exercise),
  );

  const list = useMemo(() => {
    const muscles = MUSCLE_GROUPS.find((g) => g.key === group)?.muscles;
    return (data ?? [])
      .filter((e) => (group === FAV ? e.isFavorite : group === MINE ? e.isCustom : true))
      .filter((e) => (muscles ? e.primaryMuscles.some((m) => muscles.includes(m)) : true))
      .filter((e) => (equip ? e.equipment === equip : true))
      .filter((e) => matchesQuery(q, e.nameEs, e.nameEn))
      .sort(
        (a, b) =>
          Number(b.isCustom) - Number(a.isCustom) ||
          Number(b.curated) - Number(a.curated) ||
          a.nameEs.localeCompare(b.nameEs, 'es'),
      );
  }, [data, q, group, equip]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.searchBox}>
        <Icon name="magnify" color={colors.textDim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar ejercicio (español o inglés)"
          placeholderTextColor={colors.textFaint}
          cursorColor={colors.accentText}
          selectionColor={colors.accentText}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q ? (
          <Pressable accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setQ('')}>
            <Icon name="close-circle" color={colors.textFaint} size={22} />
          </Pressable>
        ) : null}
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" active={group == null} onPress={() => setGroup(null)} />
          <Chip label="★ Favoritos" active={group === FAV} onPress={() => setGroup(FAV)} />
          <Chip label="Mis ejercicios" active={group === MINE} onPress={() => setGroup(MINE)} />
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g.key} label={g.label} active={group === g.key} onPress={() => setGroup(g.key)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todo el equipo" active={equip == null} onPress={() => setEquip(null)} />
          {EQUIPMENT_FILTER.map((k) => (
            <Chip key={k} label={EQUIPMENT_LABELS[k]} active={equip === k} onPress={() => setEquip(equip === k ? null : k)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHead}>
            <Txt variant="label" color={colors.textFaint}>
              {`${list.length} ${list.length === 1 ? 'ejercicio' : 'ejercicios'}`}
            </Txt>
            {onCreate ? (
              <Pressable onPress={onCreate} hitSlop={8} accessibilityRole="button" style={styles.newBtn}>
                <Icon name="plus" size={18} color={colors.accentText} />
                <Txt variant="smallBold" color={colors.accentText}>
                  Nuevo ejercicio
                </Txt>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Txt color={colors.textDim} style={{ padding: space.lg }}>
            {onCreate ? 'No hay resultados. Puedes crear tu propio ejercicio con «Nuevo ejercicio».' : 'No hay resultados.'}
          </Txt>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}>
            <Image
              source={exerciseThumbUri(item)}
              cachePolicy="disk"
              style={styles.thumb}
              contentFit="cover"
              transition={150}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyBold" numberOfLines={2}>
                {item.nameEs}
              </Txt>
              <Txt variant="small" color={colors.textDim} numberOfLines={1}>
                {item.isCustom ? 'Propio · ' : ''}
                {item.primaryMuscles.map(muscleLabel).join(', ')} · {equipmentLabel(item.equipment)}
              </Txt>
            </View>
            {item.isFavorite ? <Icon name="star" color={colors.accentText} size={20} /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    margin: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    minHeight: 52,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 17, fontFamily: fonts.medium },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 72,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surface2 },
});
