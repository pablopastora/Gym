import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey } from '@/db/schema';
import { toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { MEALS, mealForHour } from '@/domain/nutrition';
import { addQuickEntry, getEntry, updateQuickEntry } from '@/repositories/diary';
import { BigButton, Chip, Field, Row, Screen, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const str = (n: number | null | undefined) => (n ? fmtNum(n, 1).replace(/\./g, '') : '');

/** Añadir calorías rápidas (solo kcal y, si quieres, macros). */
export default function KcalRapidas() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealKey; entryId?: string }>();
  const entryId = params.entryId ? Number(params.entryId) : null;
  const [meal, setMeal] = useState<MealKey>(params.meal ?? mealForHour(new Date().getHours()));
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');

  useEffect(() => {
    if (!entryId) return;
    getEntry(db, entryId).then((e) => {
      if (!e) return;
      setMeal(e.meal);
      setName(e.name === 'Calorías rápidas' ? '' : e.name);
      setKcal(String(Math.round(e.kcal)));
      setP(str(e.protein));
      setC(str(e.carbs));
      setF(str(e.fat));
    });
  }, [entryId]);

  const k = parseDecimal(kcal);
  const num = (s: string) => (s ? parseDecimal(s) : null);
  const bad = (v: number | null, s: string) => !!s && (v == null || v < 0 || v > 500);
  const invalid = k == null || k <= 0 || k > 5000 || bad(num(p), p) || bad(num(c), c) || bad(num(f), f);

  const save = async () => {
    const data = { meal, name, kcal: k!, protein: num(p), carbs: num(c), fat: num(f) };
    if (entryId) await updateQuickEntry(db, entryId, data);
    else await addQuickEntry(db, { ...data, date: params.date ?? toISODate() });
    router.dismissTo('/nutricion');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Calorías rápidas' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {MEALS.map((x) => (
          <Chip key={x.key} label={x.label} active={meal === x.key} onPress={() => setMeal(x.key)} />
        ))}
      </ScrollView>
      <Field label="Kcal" suffix="kcal" keyboardType="number-pad" value={kcal} onChangeText={setKcal} autoFocus={!entryId} />
      <Field label="Descripción (opcional)" value={name} onChangeText={setName} placeholder="Menú del día, tapa…" />
      <Txt variant="small" color={colors.textDim}>
        Macros (opcional)
      </Txt>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Proteína" suffix="g" keyboardType="decimal-pad" value={p} onChangeText={setP} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Hidratos" suffix="g" keyboardType="decimal-pad" value={c} onChangeText={setC} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Grasas" suffix="g" keyboardType="decimal-pad" value={f} onChangeText={setF} />
        </View>
      </Row>
      <BigButton title={entryId ? 'Guardar cambios' : 'Añadir'} icon="check" onPress={save} disabled={invalid} />
    </Screen>
  );
}
