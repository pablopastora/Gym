import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { food, type MealKey } from '@/db/schema';
import { toISODate } from '@/domain/dates';
import { MEALS, mealForHour, type OffFood } from '@/domain/nutrition';
import { cacheOffFood, searchFoodsLocal, type Food } from '@/repositories/foods';
import { offSearch, OffError } from '@/services/openFoodFacts';
import { Chip, Icon, Row, Txt } from '@/ui/components';
import { foodSubtitle } from '@/ui/nutrition/foodText';
import { colors, fonts, radius, space } from '@/ui/theme';

type Tab = 'recientes' | 'favoritos' | 'mios' | 'recetas';
const TABS: { key: Tab; label: string }[] = [
  { key: 'recientes', label: 'Recientes' },
  { key: 'favoritos', label: '★ Favoritos' },
  { key: 'mios', label: 'Mis alimentos' },
  { key: 'recetas', label: 'Recetas' },
];

/** Buscar y elegir alimento para el diario. */
export default function AnadirComida() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealKey }>();
  const date = params.date ?? toISODate();
  const [meal, setMeal] = useState<MealKey>(params.meal ?? mealForHour(new Date().getHours()));
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('recientes');
  const [off, setOff] = useState<OffFood[] | null>(null);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);
  const { data: foods } = useLiveQuery(db.select().from(food));

  const list = useMemo(() => {
    const all = (foods ?? []).filter((f) => !f.archived);
    if (q.trim()) return searchFoodsLocal(all, q);
    if (tab === 'recientes') return all.filter((f) => f.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)).slice(0, 40);
    if (tab === 'favoritos') return all.filter((f) => f.isFavorite).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (tab === 'recetas') return all.filter((f) => f.source === 'receta').sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return all.filter((f) => f.source === 'propio' || f.source === 'off' || f.edited).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [foods, q, tab]);

  const pick = (f: Food) => router.push({ pathname: '/comida/cantidad', params: { foodId: f.id, date, meal } });

  const searchOff = async () => {
    setOffLoading(true);
    setOffError(null);
    try {
      setOff(await offSearch(q));
    } catch (e) {
      setOffError(e instanceof OffError ? e.message : 'No se pudo buscar en Open Food Facts.');
      setOff(null);
    } finally {
      setOffLoading(false);
    }
  };

  const pickOff = async (o: OffFood) => {
    const id = await cacheOffFood(db, o);
    router.push({ pathname: '/comida/cantidad', params: { foodId: id, date, meal } });
  };

  const actions: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void }[] = [
    { icon: 'barcode-scan', label: 'Escanear', onPress: () => router.push({ pathname: '/comida/escanear', params: { date, meal } }) },
    { icon: 'lightning-bolt-outline', label: 'Kcal rápidas', onPress: () => router.push({ pathname: '/comida/rapidas', params: { date, meal } }) },
    { icon: 'food-variant', label: 'Alimento propio', onPress: () => router.push('/comida/alimento') },
    { icon: 'pot-steam-outline', label: 'Receta', onPress: () => router.push('/comida/receta') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {MEALS.map((m) => (
          <Chip key={m.key} label={m.label} active={meal === m.key} onPress={() => setMeal(m.key)} />
        ))}
      </ScrollView>
      <View style={styles.searchBox}>
        <Icon name="magnify" color={colors.textDim} />
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setOff(null);
            setOffError(null);
          }}
          placeholder="Buscar alimento"
          placeholderTextColor={colors.textFaint}
          cursorColor={colors.accentText}
          selectionColor={colors.accentText}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => q.trim().length >= 3 && searchOff()}
        />
        {q ? (
          <Pressable accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setQ('')}>
            <Icon name="close-circle" color={colors.textFaint} size={22} />
          </Pressable>
        ) : null}
      </View>
      <Row gap={space.sm} style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surface2 }]}>
            <Icon name={a.icon} size={22} color={colors.accentText} />
            <Txt variant="caption" style={{ textAlign: 'center' }}>
              {a.label}
            </Txt>
          </Pressable>
        ))}
      </Row>
      {!q.trim() ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TABS.map((t) => (
            <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      ) : null}
      <FlatList
        data={list}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        ListEmptyComponent={
          <Txt color={colors.textDim} style={{ padding: space.lg }}>
            {q.trim()
              ? 'No hay resultados en tus alimentos.'
              : tab === 'recientes'
                ? 'Aún no has registrado alimentos. Busca uno (hay 250 básicos), escanea un código o crea el tuyo.'
                : 'No hay nada aquí todavía.'}
          </Txt>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => pick(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyBold" numberOfLines={2}>
                {item.name}
              </Txt>
              <Txt variant="small" color={colors.textDim} numberOfLines={1}>
                {foodSubtitle(item)}
              </Txt>
            </View>
            {item.isFavorite ? <Icon name="star" color={colors.accentText} size={20} /> : null}
          </Pressable>
        )}
        ListFooterComponent={
          q.trim().length >= 3 ? (
            <View style={{ padding: space.lg, gap: space.sm }}>
              {off == null ? (
                <Pressable onPress={searchOff} disabled={offLoading} style={({ pressed }) => [styles.offBtn, pressed && { backgroundColor: colors.surface2 }]}>
                  {offLoading ? <ActivityIndicator color={colors.accentText} /> : <Icon name="web" color={colors.accentText} />}
                  <Txt variant="bodyBold" color={colors.accentText}>{`Buscar «${q.trim()}» en Open Food Facts`}</Txt>
                </Pressable>
              ) : (
                <Txt variant="label" color={colors.textDim}>{`Open Food Facts · ${off.length} productos`}</Txt>
              )}
              {offError ? (
                <Txt variant="small" color={colors.textDim}>
                  {offError}
                </Txt>
              ) : null}
              {(off ?? []).map((o, i) => (
                <Pressable key={`${o.barcode ?? 'x'}-${i}`} onPress={() => pickOff(o)} style={({ pressed }) => [styles.row, styles.offRow, pressed && { backgroundColor: colors.surface2 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="bodyBold" numberOfLines={2}>
                      {o.name}
                    </Txt>
                    <Txt variant="small" color={colors.textDim} numberOfLines={1}>
                      {foodSubtitle(o)}
                    </Txt>
                  </View>
                </Pressable>
              ))}
              <Txt variant="caption" color={colors.textFaint}>
                Datos de productos: Open Food Facts (openfoodfacts.org), licencia ODbL. Lo que elijas se guarda en el móvil para usarlo sin conexión.
              </Txt>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, minHeight: 48, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  offRow: { paddingHorizontal: 0 },
  offBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
});
