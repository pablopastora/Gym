import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import { isValidISODate, toISODate } from '@/domain/dates';
import { parseDecimal } from '@/domain/format';
import { addCardio, CARDIO_TYPES } from '@/repositories/cardio';
import { BigButton, Chip, Field, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function NuevoCardio() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [type, setType] = useState<string>(CARDIO_TYPES[0]);
  const [minutes, setMinutes] = useState('');
  const [steps, setSteps] = useState('');
  const [km, setKm] = useState('');
  const [date, setDate] = useState(toISODate());
  const [notes, setNotes] = useState('');

  const min = parseDecimal(minutes);
  const stepsN = parseDecimal(steps);
  const kmN = parseDecimal(km);
  const errors = {
    minutes: min == null || min <= 0 || min > 600 ? 'Entre 1 y 600 minutos' : null,
    steps: steps && (stepsN == null || stepsN < 0 || !Number.isInteger(stepsN)) ? 'Número entero' : null,
    km: km && (kmN == null || kmN < 0 || kmN > 300) ? 'Distancia no válida' : null,
    date: !isValidISODate(date) ? 'Formato AAAA-MM-DD' : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = async () => {
    await addCardio(db, {
      date,
      type,
      durationMin: min!,
      steps: steps ? stepsN : null,
      distanceKm: km ? kmN : null,
      notes,
      workoutId: workoutId ? Number(workoutId) : null,
    });
    router.back();
  };

  return (
    <Screen>
      <SectionTitle>Tipo</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {CARDIO_TYPES.map((t) => (
          <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
        ))}
      </Row>
      <Field label="Duración" suffix="min" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} error={minutes ? errors.minutes : null} />
      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Pasos (opcional)" keyboardType="number-pad" value={steps} onChangeText={setSteps} error={errors.steps} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Distancia (opcional)" suffix="km" keyboardType="decimal-pad" value={km} onChangeText={setKm} error={errors.km} />
        </View>
      </Row>
      <Field label="Fecha" value={date} onChangeText={setDate} error={errors.date} />
      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Inclinación 12 %, 5 km/h…" multiline />
      {workoutId ? (
        <Txt variant="small" color={colors.textDim}>
          Se vinculará a la sesión de fuerza en curso.
        </Txt>
      ) : null}
      <BigButton title="Guardar cardio" icon="content-save" onPress={save} disabled={invalid} />
    </Screen>
  );
}
