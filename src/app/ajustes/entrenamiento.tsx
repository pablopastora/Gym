import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { db } from '@/db/client';
import type { Profile } from '@/db/schema';
import { parseDecimal } from '@/domain/format';
import { useProfile } from '@/hooks/useDb';
import { updateProfile } from '@/repositories/profile';
import { defaultTrainingWeekdays, resolveTrainingWeekdays, WEEKDAY_NAMES } from '@/domain/weekPlan';
import { BigButton, Card, Chip, Field, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

type Form = {
  daysPerWeek: number;
  weekdays: number[];
  effortMetric: 'rir' | 'rpe' | 'ninguno';
  barKg: string;
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
    weekdays: resolveTrainingWeekdays(p),
    effortMetric: p.effortMetric,
    barKg: s(p.barKg),
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
  const bar = parseDecimal(form.barKg);
  const errors = {
    barKg: bar == null || bar < 0 || bar > 30 ? 'Entre 0 y 30 kg' : null,
    incUpper: inc(form.incUpper),
    incLower: inc(form.incLower),
    restCompound: rest(form.restCompound),
    restAccessory: rest(form.restAccessory),
    restAbs: rest(form.restAbs),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const save = async () => {
    await updateProfile(db, {
      daysPerWeek: form.weekdays.length,
      trainingWeekdays: form.weekdays,
      effortMetric: form.effortMetric,
      barKg: bar!,
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
      <SectionTitle>Días de entreno</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {WEEKDAY_NAMES.map((name, i) => {
          const d = i + 1;
          const on = form.weekdays.includes(d);
          return (
            <Chip
              key={d}
              label={name.slice(0, 3)}
              active={on}
              onPress={() => {
                const next = on ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d].sort((a, b) => a - b);
                if (next.length) set({ weekdays: next });
              }}
            />
          );
        })}
      </Row>
      <Row gap={space.sm}>
        <Chip label="4 días (L-M-J-V)" onPress={() => set({ weekdays: defaultTrainingWeekdays(4) })} />
        <Chip label="5 días (L-V)" onPress={() => set({ weekdays: defaultTrainingWeekdays(5) })} />
      </Row>
      <Txt variant="small" color={colors.textDim}>
        {`${form.weekdays.length} días por semana. El resto son días de descanso. Con menos de 5 días se salta el día opcional de la rutina.`}
      </Txt>

      <SectionTitle>Esfuerzo por serie</SectionTitle>
      <Segmented
        options={[
          { value: 'rir', label: 'RIR' },
          { value: 'rpe', label: 'RPE' },
          { value: 'ninguno', label: 'Ninguno' },
        ]}
        value={form.effortMetric}
        onChange={(v) => set({ effortMetric: v })}
      />
      <Txt variant="small" color={colors.textDim}>
        RIR = repeticiones que te quedaban en reserva (0 = al fallo). RPE = esfuerzo de 1 a 10. Es opcional en cada serie.
      </Txt>

      <SectionTitle>Calentamiento</SectionTitle>
      <Field label="Peso de la barra olímpica" suffix="kg" keyboardType="decimal-pad" value={form.barKg} onChangeText={(v) => set({ barKg: v })} error={errors.barKg} />

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
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.text}
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
