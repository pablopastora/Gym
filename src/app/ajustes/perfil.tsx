import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { db } from '@/db/client';
import type { Profile } from '@/db/schema';
import { bmi, bmiCategory, BMI_LABELS, weightForBmi } from '@/domain/body';
import { formatDateShort, isValidISODate, parseISODate, toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { evaluateGoal, RECOMMENDED_RATE, suggestedGoalDates } from '@/domain/goals';
import { useProfile } from '@/hooks/useDb';
import { updateProfile } from '@/repositories/profile';
import { Banner, BigButton, Card, Chip, Field, IconButton, Row, SectionTitle, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

type Form = {
  heightCm: string;
  startWeightKg: string;
  goalWeightKg: string;
  goalDate: string;
  age: string;
  sex: 'hombre' | 'mujer' | null;
  injuries: string;
};

const str = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

export default function Perfil() {
  const profile = useProfile();
  return profile ? <PerfilForm profile={profile} /> : null;
}

function PerfilForm({ profile }: { profile: Profile }) {
  const [form, setForm] = useState<Form>(() => ({
    heightCm: str(profile.heightCm),
    startWeightKg: str(profile.startWeightKg),
    goalWeightKg: str(profile.goalWeightKg),
    goalDate: profile.goalDate ?? '',
    age: str(profile.age),
    sex: profile.sex ?? null,
    injuries: profile.injuries ?? '',
  }));
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const height = parseDecimal(form.heightCm);
  const weight = parseDecimal(form.startWeightKg);
  const goalKg = parseDecimal(form.goalWeightKg);
  const age = parseDecimal(form.age);
  const today = toISODate();

  const errors = {
    heightCm: height == null || height < 120 || height > 230 ? 'Entre 120 y 230 cm' : null,
    startWeightKg: weight == null || weight < 35 || weight > 300 ? 'Entre 35 y 300 kg' : null,
    goalWeightKg: form.goalWeightKg && (goalKg == null || goalKg < 35 || goalKg > 300) ? 'Entre 35 y 300 kg' : null,
    goalDate: form.goalDate && !isValidISODate(form.goalDate) ? 'Formato AAAA-MM-DD' : null,
    age: form.age && (age == null || age < 14 || age > 100 || !Number.isInteger(age)) ? 'Edad no válida' : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const imc = height && weight ? bmi(weight, height) : null;
  const goal =
    weight && !errors.goalWeightKg && !errors.goalDate
      ? evaluateGoal({ currentKg: weight, goalKg, goalDate: form.goalDate || null, today })
      : null;
  const suggestions = weight && goalKg && goalKg < weight ? suggestedGoalDates(weight, goalKg, today) : null;

  const pickDate = () => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: form.goalDate && isValidISODate(form.goalDate) ? parseISODate(form.goalDate) : new Date(),
      mode: 'date',
      minimumDate: new Date(),
      onValueChange: (_e, d) => set({ goalDate: toISODate(d) }),
    });
  };

  const save = async () => {
    if (hasErrors) return;
    setSaving(true);
    await updateProfile(db, {
      heightCm: height!,
      startWeightKg: weight!,
      goalWeightKg: goalKg,
      goalDate: form.goalDate || null,
      age: age,
      sex: form.sex,
      injuries: form.injuries.trim() || null,
    });
    setSaving(false);
    router.back();
  };

  const bannerKind =
    goal?.status === 'muy_agresivo' || goal?.status === 'fecha_pasada'
      ? 'danger'
      : goal?.status === 'agresivo' || goal?.status === 'ganancia'
        ? 'warning'
        : goal?.status === 'recomendado' || goal?.status === 'alcanzado'
          ? 'ok'
          : 'info';

  return (
    <Screen>
      <SectionTitle>Cuerpo</SectionTitle>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Altura" suffix="cm" keyboardType="decimal-pad" value={form.heightCm} onChangeText={(v) => set({ heightCm: v })} error={errors.heightCm} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Peso inicial" suffix="kg" keyboardType="decimal-pad" value={form.startWeightKg} onChangeText={(v) => set({ startWeightKg: v })} error={errors.startWeightKg} />
        </View>
      </Row>
      {imc ? (
        <Card>
          <Row align="flex-start">
            <Stat label="IMC" value={fmtNum(imc)} sub={BMI_LABELS[bmiCategory(imc)]} />
            <Stat label="Peso para IMC 25" value={`${fmtNum(weightForBmi(25, height!))} kg`} sub="Referencia orientativa" />
          </Row>
          <Txt variant="caption" color={colors.textFaint}>
            El IMC no distingue músculo de grasa: en recomposición, la cintura es mejor indicador.
          </Txt>
        </Card>
      ) : null}

      <SectionTitle>Objetivo · recomposición</SectionTitle>
      <Field label="Peso objetivo (opcional)" suffix="kg" keyboardType="decimal-pad" value={form.goalWeightKg} onChangeText={(v) => set({ goalWeightKg: v })} error={errors.goalWeightKg} />
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Fecha objetivo (opcional)"
            placeholder="AAAA-MM-DD"
            value={form.goalDate}
            onChangeText={(v) => set({ goalDate: v })}
            error={errors.goalDate}
            hint={form.goalDate && !errors.goalDate ? formatDateShort(form.goalDate) : undefined}
          />
        </View>
        {Platform.OS === 'android' ? <IconButton name="calendar" label="Elegir fecha" onPress={pickDate} /> : null}
      </Row>
      {suggestions ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="small" color={colors.textDim}>
            Fechas recomendadas ({fmtNum(RECOMMENDED_RATE.min, 2)}-{fmtNum(RECOMMENDED_RATE.max, 2)} kg/semana):
          </Txt>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            <Chip label={`A 0,75 kg/sem: ${formatDateShort(suggestions.fast)}`} onPress={() => set({ goalDate: suggestions.fast })} />
            <Chip label={`A 0,5 kg/sem: ${formatDateShort(suggestions.slow)}`} onPress={() => set({ goalDate: suggestions.slow })} />
          </Row>
        </View>
      ) : null}
      {goal ? <Banner kind={bannerKind}>{goal.message}</Banner> : null}

      <SectionTitle>Datos opcionales</SectionTitle>
      <Field label="Edad" keyboardType="number-pad" value={form.age} onChangeText={(v) => set({ age: v })} error={errors.age} />
      <Txt variant="small" color={colors.textDim}>
        Sexo
      </Txt>
      <Segmented
        options={[
          { value: 'hombre', label: 'Hombre' },
          { value: 'mujer', label: 'Mujer' },
          { value: 'ns', label: 'Sin indicar' },
        ]}
        value={form.sex ?? 'ns'}
        onChange={(v) => set({ sex: v === 'ns' ? null : (v as 'hombre' | 'mujer') })}
      />
      <Field
        label="Lesiones o limitaciones"
        placeholder="Ej.: molestia en hombro derecho, evitar press tras nuca"
        multiline
        value={form.injuries}
        onChangeText={(v) => set({ injuries: v })}
      />

      <BigButton title="Guardar" icon="content-save" onPress={save} disabled={hasErrors} loading={saving} />
    </Screen>
  );
}
