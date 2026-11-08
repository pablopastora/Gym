import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { food, type FoodPref } from '@/db/schema';
import { DIET_FLAGS } from '@/domain/mealPlanner';
import { useProfile } from '@/hooks/useDb';
import { searchFoodsLocal, type Food } from '@/repositories/foods';
import { clearPantry, setDietFlags, setFoodPantry, setFoodPref } from '@/repositories/mealPlanner';
import { showAlert } from '@/ui/alert';
import { Chip, Icon, Row, Txt, type IconName } from '@/ui/components';
import { colors, fonts, radius, space } from '@/ui/theme';

type Filter = 'todos' | 'gusta' | 'casa' | 'excluidos';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'gusta', label: '♥ Me gusta' },
  { key: 'casa', label: 'En casa' },
  { key: 'excluidos', label: 'Excluidos' },
];

/** Preferencias de comida: dieta, «me gusta», «tengo en casa» y «no me gusta / alergia». */
export default function PreferenciasComida() {
  const p = useProfile();
  const { data } = useLiveQuery(db.select().from(food));
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const flags = p?.dietFlags ?? [];

  const list = useMemo(() => {
    let all = (data ?? []).filter((f) => !f.archived && f.source !== 'receta');
    if (filter === 'gusta') all = all.filter((f) => f.pref === 'gusta');
    if (filter === 'casa') all = all.filter((f) => f.inPantry);
    if (filter === 'excluidos') all = all.filter((f) => f.pref === 'no_gusta' || f.pref === 'alergia');
    return q.trim() ? searchFoodsLocal(all, q, 100) : all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [data, q, filter]);

  const togglePref = (f: Food, pref: FoodPref) => setFoodPref(db, f.id, f.pref === pref ? null : pref);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <Txt variant="label" color={colors.textDim}>
          Dieta
        </Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {DIET_FLAGS.map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              active={flags.includes(d.key)}
              onPress={() => setDietFlags(db, flags.includes(d.key) ? flags.filter((x) => x !== d.key) : [...flags, d.key])}
            />
          ))}
        </Row>
        <Txt variant="caption" color={colors.textFaint}>
          ♥ me gusta · casa = lo tengo en casa (se prioriza) · ⊘ no me gusta · ⚠ alergia o intolerancia. Los dos últimos no se proponen nunca.
        </Txt>
      </View>
      <View style={styles.searchBox}>
        <Icon name="magnify" color={colors.textDim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar alimento"
          placeholderTextColor={colors.textFaint}
          cursorColor={colors.accentText}
          style={styles.searchInput}
        />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
          <Chip
            label="Vaciar «en casa»"
            onPress={() =>
              showAlert('Vaciar «en casa»', '¿Quitar la marca «en casa» de todos los alimentos?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Vaciar', onPress: () => clearPantry(db) },
              ])
            }
          />
        </ScrollView>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={list}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        ListEmptyComponent={
          <Txt color={colors.textDim} style={{ padding: space.lg }}>
            Nada por aquí.
          </Txt>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Txt style={{ flex: 1 }} numberOfLines={2}>
              {item.name}
            </Txt>
            <Toggle icon={item.pref === 'gusta' ? 'heart' : 'heart-outline'} on={item.pref === 'gusta'} label="Me gusta" onPress={() => togglePref(item, 'gusta')} />
            <Toggle icon={item.inPantry ? 'home' : 'home-outline'} on={item.inPantry} label="Lo tengo en casa" onPress={() => setFoodPantry(db, item.id, !item.inPantry)} />
            <Toggle icon="cancel" on={item.pref === 'no_gusta'} label="No me gusta" onPress={() => togglePref(item, 'no_gusta')} />
            <Toggle icon="alert-circle-outline" on={item.pref === 'alergia'} label="Alergia o intolerancia" onPress={() => togglePref(item, 'alergia')} />
          </View>
        )}
      />
    </View>
  );
}

function Toggle({ icon, on, label, onPress }: { icon: IconName; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.toggle}>
      <Icon name={icon} size={22} color={on ? colors.accentText : colors.textFaint} />
    </Pressable>
  );
}


const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, minHeight: 48, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toggle: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
