import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey } from '@/db/schema';
import { fmtNum, parseDecimal } from '@/domain/format';
import { validateFood } from '@/domain/nutrition';
import { archiveFood, createCustomFood, getFood, updateFood, type FoodInput } from '@/repositories/foods';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Field, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

const str = (n: number | null | undefined) => (n == null ? '' : fmtNum(n, 2).replace(/\./g, ''));

/** Crear o editar un alimento (valores por 100 g). */
export default function AlimentoForm() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string; date?: string; meal?: MealKey }>();
  const id = params.id ? Number(params.id) : null;
  const [source, setSource] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    barcode: params.barcode ?? '',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    unitLabel: '',
    unitG: '',
    servingG: '',
  });
  const set = (p: Partial<typeof form>) => setForm({ ...form, ...p });

  useEffect(() => {
    if (!id) return;
    getFood(db, id).then((f) => {
      if (!f) return;
      setSource(f.source);
      setForm({
        name: f.name,
        brand: f.brand ?? '',
        barcode: f.barcode ?? '',
        kcal: str(f.kcal),
        protein: str(f.protein),
        carbs: str(f.carbs),
        fat: str(f.fat),
        fiber: str(f.fiber),
        unitLabel: f.unitLabel ?? '',
        unitG: str(f.unitG),
        servingG: str(f.servingG),
      });
    });
  }, [id]);

  const n = (s: string) => parseDecimal(s);
  const input: FoodInput = {
    name: form.name,
    brand: form.brand || null,
    barcode: form.barcode || null,
    kcal: n(form.kcal) ?? -1,
    protein: n(form.protein) ?? -1,
    carbs: n(form.carbs) ?? -1,
    fat: n(form.fat) ?? -1,
    fiber: form.fiber ? n(form.fiber) : null,
    unitLabel: form.unitLabel.trim() ? (form.unitLabel.trim().startsWith('1 ') ? form.unitLabel.trim() : `1 ${form.unitLabel.trim()}`) : null,
    unitG: form.unitG ? n(form.unitG) : null,
    servingG: form.servingG ? n(form.servingG) : null,
  };
  const error = validateFood({ name: input.name, kcal: n(form.kcal), protein: n(form.protein), carbs: n(form.carbs), fat: n(form.fat) });
  const unitError = form.unitG && (input.unitG == null || input.unitG <= 0 || input.unitG > 2000) ? 'Gramos no válidos' : null;
  const servingError = form.servingG && (input.servingG == null || input.servingG <= 0 || input.servingG > 2000) ? 'Gramos no válidos' : null;
  const estKcal = (n(form.protein) ?? 0) * 4 + (n(form.carbs) ?? 0) * 4 + (n(form.fat) ?? 0) * 9;
  const kcalOff = n(form.kcal) != null && estKcal > 0 && Math.abs(estKcal - n(form.kcal)!) > Math.max(40, n(form.kcal)! * 0.25);

  const save = async () => {
    if (id) {
      await updateFood(db, id, input);
      router.back();
      return;
    }
    const newId = await createCustomFood(db, input);
    if (params.date) router.replace({ pathname: '/comida/cantidad', params: { foodId: newId, date: params.date, meal: params.meal } });
    else router.back();
  };

  const remove = () =>
    showAlert('Borrar alimento', 'Dejará de aparecer en búsquedas. Lo ya registrado en el diario no cambia.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await archiveFood(db, id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Editar alimento' : 'Alimento propio' }} />
      {source === 'base' ? (
        <Banner kind="info">Alimento de la lista básica (USDA). Si lo editas, se guarda tu versión y no se sobrescribe al actualizar la lista.</Banner>
      ) : null}
      {source === 'off' ? <Banner kind="info">Producto de Open Food Facts. Si corriges algún valor, se guarda tu versión.</Banner> : null}
      <Field label="Nombre" value={form.name} onChangeText={(v) => set({ name: v })} />
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Marca (opcional)" value={form.brand} onChangeText={(v) => set({ brand: v })} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Código de barras" keyboardType="number-pad" value={form.barcode} onChangeText={(v) => set({ barcode: v })} />
        </View>
      </Row>
      <SectionTitle>Por 100 g</SectionTitle>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Kcal" keyboardType="decimal-pad" value={form.kcal} onChangeText={(v) => set({ kcal: v })} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Proteína" suffix="g" keyboardType="decimal-pad" value={form.protein} onChangeText={(v) => set({ protein: v })} />
        </View>
      </Row>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Hidratos" suffix="g" keyboardType="decimal-pad" value={form.carbs} onChangeText={(v) => set({ carbs: v })} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Grasas" suffix="g" keyboardType="decimal-pad" value={form.fat} onChangeText={(v) => set({ fat: v })} />
        </View>
      </Row>
      <Field label="Fibra (opcional)" suffix="g" keyboardType="decimal-pad" value={form.fiber} onChangeText={(v) => set({ fiber: v })} />
      {kcalOff ? (
        <Txt variant="caption" color={colors.textFaint}>
          {`Ojo: con esos macros saldrían unas ${fmtNum(estKcal, 0)} kcal. Revisa que los datos sean por 100 g.`}
        </Txt>
      ) : null}
      <SectionTitle>Porciones (opcional)</SectionTitle>
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Unidad" value={form.unitLabel} onChangeText={(v) => set({ unitLabel: v })} placeholder="galleta, loncha…" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Gramos por unidad" suffix="g" keyboardType="decimal-pad" value={form.unitG} onChangeText={(v) => set({ unitG: v })} error={unitError} />
        </View>
      </Row>
      <Field label="Ración habitual" suffix="g" keyboardType="decimal-pad" value={form.servingG} onChangeText={(v) => set({ servingG: v })} error={servingError} />
      {error && form.name ? (
        <Txt variant="small" color={colors.textDim}>
          {error}
        </Txt>
      ) : null}
      <BigButton title="Guardar" icon="content-save" onPress={save} disabled={!!error || !!unitError || !!servingError} />
      {id ? <BigButton title="Borrar alimento" icon="delete-outline" kind="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
