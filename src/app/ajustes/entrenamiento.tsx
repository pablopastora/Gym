import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { db } from '@/db/client';
import type { Profile } from '@/db/schema';
import { parseDecimal } from '@/domain/format';
import { useProfile } from '@/hooks/useDb';
import { updateProfile } from '@/repositories/profile';
import { BigButton, Card, Field, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

type Form = {
  daysPerWeek: number;
  incUpper: string;
  incLower: string;
  restCompound: string;
  restAccessory: string;
  restAbs: string;
  deficitMode: boolean;
};

const s = (n: number) => String(n).replace('.', ',');

export default function AjustesEntrenamiento() {
  const p = useProfile();
  return p ? <EntrenamientoForm p={p} /> : null;
}

function EntrenamientoForm({ p }: { p: Profile }) {
  const [form, setForm] = useState<Form>(() => ({
    daysPerWeek: p.daysPerWeek,
    incUpper: s(p.incrementUpperKg),
    incLower: s(p.incrementLowerKg),
    restCompound: s(p.restCompoundS),
    restAccessory: s(p.restAccessoryS),
    restAbs: s(p.restAbsS),
    deficitMode: p.deficitMode,
  }));

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const inc = (v: string) => {
    const n = parseDecimal(v);
    return n == null || n <= 0 || n > 20 ? 'Entre 0,5 y 20 kg' : null;
  };
  const rest = (v: string) => {
    const n = parseDecimal(v);
    return n == null || n < 15 || n > 600 || !Number.isInteger(n) ? 'Entre 15 y 600 s' : null;
  };
  const errors = {
    incUpper: inc(form.incUpper),
    incLower: inc(form.incLower),
    restCompound: rest(form.restCompound),
    restAccessory: rest(form.restAccessory),
    restAbs: rest(form.restAbs),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const save = async () => {
    await updateProfile(db, {
      daysPerWeek: form.daysPerWeek,
      incrementUpperKg: parseDecimal(form.incUpper)!,
      incrementLowerKg: parseDecimal(form.incLower)!,
      restCompoundS: parseDecimal(form.restCompound)!,
      restAccessoryS: parseDecimal(form.restAccessory)!,
      restAbsS: parseDecimal(form.restAbs)!,
      deficitMode: form.deficitMode,
    });
    router.back();
  };

  return (
    <Screen>
      <SectionTitle>Días por semana</SectionTitle>
      <Segmented
        options={[
          { value: 4, label: '4 días' },
          { value: 5, label: '5 días' },
        ]}
        value={form.daysPerWeek}
        onChange={(v) => set({ daysPerWeek: v })}
      />
      <Txt variant="small" color={colors.textDim}>
        Con 4 días se salta el día 5 (opcional) de la rutina.
      </Txt>

      <SectionTitle>Incremento de carga (doble progresión)</SectionTitle>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Tren superior" suffix="kg" keyboardType="decimal-pad" value={form.incUpper} onChangeText={(v) => set({ incUpper: v })} error={errors.incUpper} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Tren inferior" suffix="kg" keyboardType="decimal-pad" value={form.incLower} onChangeText={(v) => set({ incLower: v })} error={errors.incLower} />
        </View>
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="bodyBold">Modo déficit</Txt>
            <Txt variant="small" color={colors.textDim}>
              Subidas más prudentes: si la última sesión fue al fallo (RIR 0), la pierna sube +2,5 kg en vez de +5, y
              nunca hay dos subidas seguidas sin una sesión de consolidación.
            </Txt>
          </View>
          <Switch
            value={form.deficitMode}
            onValueChange={(v) => set({ deficitMode: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
      </Card>

      <SectionTitle>Descanso por defecto (segundos)</SectionTitle>
      <Field label="Básicos pesados (2-3 min)" suffix="s" keyboardType="number-pad" value={form.restCompound} onChangeText={(v) => set({ restCompound: v })} error={errors.restCompound} />
      <Field label="Accesorios (60-90 s)" suffix="s" keyboardType="number-pad" value={form.restAccessory} onChangeText={(v) => set({ restAccessory: v })} error={errors.restAccessory} />
      <Field label="Abdominales (45-60 s)" suffix="s" keyboardType="number-pad" value={form.restAbs} onChangeText={(v) => set({ restAbs: v })} error={errors.restAbs} />
      <Txt variant="small" color={colors.textDim}>
        Algunos ejercicios tienen un descanso propio (p. ej. sentadilla 3 min) y cada ejercicio de la rutina puede
        sobrescribirlo.
      </Txt>

      <BigButton title="Guardar" icon="content-save" onPress={save} disabled={hasErrors} />
    </Screen>
  );
}
