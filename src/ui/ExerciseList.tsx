import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { exerciseImageUrl } from '@/data/library';
import { equipmentLabel, muscleLabel } from '@/data/labels';
import { db } from '@/db/client';
import { exercise } from '@/db/schema';
import { matchesQuery, MUSCLE_GROUPS } from '@/domain/search';

import { Chip, Icon, Txt } from './components';
import { colors, fonts, radius, space } from './theme';

const FAV = '__fav';

/** Buscador + filtros + lista de ejercicios (biblioteca y selector). */
export function ExerciseList({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
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
      })
      .from(exercise),
  );

  const list = useMemo(() => {
    const muscles = MUSCLE_GROUPS.find((g) => g.key === group)?.muscles;
    return (data ?? [])
      .filter((e) => (group === FAV ? e.isFavorite : true))
      .filter((e) => (muscles ? e.primaryMuscles.some((m) => muscles.includes(m)) : true))
      .filter((e) => matchesQuery(q, e.nameEs, e.nameEn))
      .sort((a, b) => Number(b.curated) - Number(a.curated) || a.nameEs.localeCompare(b.nameEs, 'es'));
  }, [data, q, group]);

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
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g.key} label={g.label} active={group === g.key} onPress={() => setGroup(g.key)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        initialNumToRender={15}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Txt variant="label" color={colors.textFaint} style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            {`${list.length} ejercicios`}
          </Txt>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}>
            <Image
              source={item.images[0] ? exerciseImageUrl(item.images[0]) : undefined}
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
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
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
