import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey, QuantityUnit } from '@/db/schema';
import { toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { gramsFor, macrosFor, MEALS, mealForHour, unitsFor } from '@/domain/nutrition';
import { addFoodEntry, getEntry, updateFoodEntry } from '@/repositories/diary';
import { getFood, setFoodFavorite, type Food } from '@/repositories/foods';
import { BigButton, Card, Chip, Field, IconButton, Row, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { foodSubtitle } from '@/ui/nutrition/foodText';
import { colors, space } from '@/ui/theme';

const QUICK: Record<QuantityUnit, number[]> = { g: [50, 100, 150, 200, 250], unidad: [1, 2, 3, 4], racion: [0.5, 1, 1.5, 2] };

/** Cantidad de un alimento (nuevo registro o edición), con macros al instante. */
export default function CantidadComida() {
  const params = useLocalSearchParams<{ foodId: string; date?: string; meal?: MealKey; entryId?: string }>();
  const entryId = params.entryId ? Number(params.entryId) : null;
  const [f, setF] = useState<Food | null>(null);
  const [meal, setMeal] = useState<MealKey>(params.meal ?? mealForHour(new Date().getHours()));
  const [unit, setUnit] = useState<QuantityUnit>('g');
  const [qty, setQty] = useState('');
  const date = params.date ?? toISODate();

  useEffect(() => {
    (async () => {
      const food = await getFood(db, Number(params.foodId));
      setF(food);
      if (!food) return;
      if (entryId) {
        const e = await getEntry(db, entryId);
        if (e) {
          setMeal(e.meal);
          setUnit(e.unit ?? 'g');
          setQty(fmtNum(e.quantity ?? e.grams ?? 0, 2).replace(/\./g, ''));
          return;
        }
      }
      // Por defecto: 1 unidad si la tiene, si no 1 ración, si no 100 g.
      if (food.unitG) {
        setUnit('unidad');
        setQty('1');
      } else if (food.servingG) {
        setUnit('racion');
        setQty('1');
      } else setQty('100');
    })();
  }, [params.foodId, entryId]);

  if (!f) return null;
  const q = parseDecimal(qty);
  const grams = q != null ? gramsFor(f, q, unit) : null;
  const m = grams ? macrosFor(f, grams) : null;
  const invalid = !grams || grams > 5000;

  const save = async () => {
    if (entryId) await updateFoodEntry(db, entryId, { meal, food: f, quantity: q!, unit });
    else await addFoodEntry(db, { date, meal, food: f, quantity: q!, unit });
    router.dismissTo('/nutricion');
  };

  const editFood = () =>
    f.source === 'receta' ? router.push({ pathname: '/comida/receta', params: { id: f.id } }) : router.push({ pathname: '/comida/alimento', params: { id: f.id } });

  return (
    <Screen>
      <Stack.Screen options={{ title: entryId ? 'Editar' : 'Cantidad' }} />
      <Row align="flex-start">
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h2">{f.name}</Txt>
          <Txt variant="small" color={colors.textDim}>
            {foodSubtitle(f)}
          </Txt>
        </View>
        <IconButton
          name={f.isFavorite ? 'star' : 'star-outline'}
          label={f.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          color={f.isFavorite ? colors.accentText : colors.textDim}
          onPress={async () => {
            await setFoodFavorite(db, f.id, !f.isFavorite);
            setF({ ...f, isFavorite: !f.isFavorite });
          }}
        />
        <IconButton name="pencil-outline" label="Editar alimento" color={colors.textDim} onPress={editFood} />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {MEALS.map((x) => (
          <Chip key={x.key} label={x.label} active={meal === x.key} onPress={() => setMeal(x.key)} />
        ))}
      </ScrollView>

      <Segmented
        options={unitsFor(f)}
        value={unit}
        onChange={(u) => {
          setUnit(u);
          setQty(u === 'g' ? String(Math.round(grams ?? 100)) : '1');
        }}
      />
      <Field
        label={unit === 'g' ? 'Gramos' : unit === 'unidad' ? `Unidades (${fmtNum(f.unitG ?? 0, 0)} g)` : `Raciones (${fmtNum(f.servingG ?? 0, 0)} g)`}
        suffix={unit === 'g' ? 'g' : unit === 'unidad' ? 'ud.' : 'rac.'}
        keyboardType="decimal-pad"
        value={qty}
        onChangeText={setQty}
        error={qty && invalid ? 'Cantidad no válida' : null}
        autoFocus={!entryId}
        selectTextOnFocus
      />
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {QUICK[unit].map((v) => (
          <Chip key={v} label={`${fmtNum(v, 1)}${unit === 'g' ? ' g' : ''}`} active={q === v} onPress={() => setQty(fmtNum(v, 1))} />
        ))}
      </Row>

      <Card>
        <Row align="flex-start">
          <Stat label="Kcal" value={m ? fmtNum(m.kcal, 0) : '—'} sub={grams ? `${fmtNum(grams, 0)} g` : undefined} color={colors.accentText} />
          <Stat label="Proteína" value={m ? fmtNum(m.protein, 1) : '—'} sub="g" />
          <Stat label="Hidratos" value={m ? fmtNum(m.carbs, 1) : '—'} sub="g" />
          <Stat label="Grasas" value={m ? fmtNum(m.fat, 1) : '—'} sub="g" />
        </Row>
        {m && m.fiber ? (
          <Txt variant="caption" color={colors.textFaint}>
            {`Fibra ${fmtNum(m.fiber, 1)} g`}
          </Txt>
        ) : null}
      </Card>

      <BigButton title={entryId ? 'Guardar cambios' : 'Añadir al diario'} icon="check" onPress={save} disabled={invalid} />
    </Screen>
  );
}
