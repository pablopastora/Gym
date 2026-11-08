import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { fmtNum, parseDecimal } from '@/domain/format';
import { recipeTotals } from '@/domain/nutrition';
import { archiveFood, getFood, ingredientFoodsQuery, recipeItems, saveRecipe, searchFoodsLocal, type Food } from '@/repositories/foods';
import { showAlert } from '@/ui/alert';
import { BigButton, Card, Field, Icon, IconButton, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { colors, fonts, radius, space } from '@/ui/theme';

interface Item {
  food: Food;
  grams: string;
}

/** Receta propia: suma de ingredientes, dividida en raciones. */
export default function RecetaForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [cooked, setCooked] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const { data: foods } = useLiveQuery(ingredientFoodsQuery(db));

  useEffect(() => {
    if (!id) return;
    (async () => {
      const f = await getFood(db, id);
      if (!f) return;
      setName(f.name);
      setServings(fmtNum(f.servings ?? 1, 1));
      const its = await recipeItems(db, id);
      setItems(its.map((i) => ({ food: i.food, grams: fmtNum(i.grams, 1).replace(/\./g, '') })));
      // Si se guardó con peso final cocinado, recuperarlo (ración × raciones ≠ suma de ingredientes).
      const raw = its.reduce((a, i) => a + i.grams, 0);
      const final = (f.servingG ?? 0) * (f.servings ?? 1);
      if (final > 0 && Math.abs(final - raw) > raw * 0.02) setCooked(String(Math.round(final)));
    })();
  }, [id]);

  const results = useMemo(() => (q.trim() ? searchFoodsLocal(foods ?? [], q, 8) : []), [foods, q]);
  const sv = parseDecimal(servings);
  const cookedN = cooked ? parseDecimal(cooked) : null;
  const parsed = items.map((i) => ({ food: i.food, grams: parseDecimal(i.grams) ?? 0 }));
  const totals = recipeTotals(parsed, sv && sv > 0 ? sv : 1, cookedN);
  const invalid = !name.trim() || !sv || sv <= 0 || sv > 50 || !parsed.some((p) => p.grams > 0) || parsed.some((p) => p.grams < 0 || p.grams > 5000);

  const save = async () => {
    await saveRecipe(db, { name, servings: sv!, cookedWeightG: cookedN, items: parsed.map((p) => ({ foodId: p.food.id, grams: p.grams })) }, id);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Editar receta' : 'Nueva receta' }} />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Lentejas con verduras" />
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Raciones" keyboardType="decimal-pad" value={servings} onChangeText={setServings} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Peso final (opcional)" suffix="g" keyboardType="decimal-pad" value={cooked} onChangeText={setCooked} hint="Ya cocinado, si lo pesas" />
        </View>
      </Row>

      <SectionTitle>Ingredientes</SectionTitle>
      {items.map((it, idx) => (
        <Row key={`${it.food.id}-${idx}`} gap={space.sm}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyBold" numberOfLines={1}>
              {it.food.name}
            </Txt>
            <Txt variant="caption" color={colors.textFaint}>{`${fmtNum(((parseDecimal(it.grams) ?? 0) * it.food.kcal) / 100, 0)} kcal`}</Txt>
          </View>
          <View style={{ width: 110 }}>
            <Field
              label="Gramos"
              suffix="g"
              keyboardType="decimal-pad"
              value={it.grams}
              onChangeText={(v) => setItems(items.map((x, i) => (i === idx ? { ...x, grams: v } : x)))}
            />
          </View>
          <IconButton name="close" label="Quitar ingrediente" color={colors.textDim} onPress={() => setItems(items.filter((_, i) => i !== idx))} />
        </Row>
      ))}
      <View style={styles.searchBox}>
        <Icon name="plus" color={colors.textDim} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Añadir ingrediente (buscar)"
          placeholderTextColor={colors.textFaint}
          cursorColor={colors.accentText}
          style={styles.searchInput}
        />
      </View>
      {results.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => {
            setItems([...items, { food: f, grams: String(Math.round(f.servingG ?? 100)) }]);
            setQ('');
          }}
          style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.surface2 }]}>
          <Txt variant="body" numberOfLines={1}>
            {f.name}
          </Txt>
          <Txt variant="caption" color={colors.textFaint}>{`${fmtNum(f.kcal, 0)} kcal/100 g`}</Txt>
        </Pressable>
      ))}

      <Card>
        <Txt variant="label" color={colors.textDim}>{`Por ración (${fmtNum(totals.servingG, 0)} g)`}</Txt>
        <Row align="flex-start">
          <Stat label="Kcal" value={fmtNum(totals.perServing.kcal, 0)} color={colors.accentText} />
          <Stat label="Prot." value={fmtNum(totals.perServing.protein, 1)} sub="g" />
          <Stat label="Hidr." value={fmtNum(totals.perServing.carbs, 1)} sub="g" />
          <Stat label="Grasas" value={fmtNum(totals.perServing.fat, 1)} sub="g" />
        </Row>
        <Txt variant="caption" color={colors.textFaint}>
          {`Total ${fmtNum(totals.total.kcal, 0)} kcal · ${fmtNum(totals.totalG, 0)} g · ${fmtNum(totals.per100.kcal, 0)} kcal/100 g`}
        </Txt>
      </Card>

      <BigButton title="Guardar receta" icon="content-save" onPress={save} disabled={invalid} />
      {id ? (
        <BigButton
          title="Borrar receta"
          icon="delete-outline"
          kind="ghost"
          onPress={() =>
            showAlert('Borrar receta', 'Dejará de aparecer. Lo ya registrado en el diario no cambia.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Borrar',
                style: 'destructive',
                onPress: async () => {
                  await archiveFood(db, id);
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, minHeight: 48, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  result: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
});
