import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import {
  CARDIO_EXPLANATION,
  CARDIO_TYPES,
  estimateCardio,
  hasIncline,
  INTENSITY_LABELS,
  isPacedType,
  speedFrom,
  type CardioIntensity,
  type PaceInput,
} from '@/domain/cardio';
import { isValidISODate, toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { addCardio, convertExerciseToCardio, getCardio, updateCardio, type CardioInput } from '@/repositories/cardio';
import { bodyKgAt } from '@/repositories/kcal';
import { showAlert } from '@/ui/alert';
import { BigButton, Card, Chip, Field, IconButton, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const INTENSITIES: CardioIntensity[] = ['suave', 'moderada', 'intensa'];
const PACE_OPTIONS: { value: PaceInput; label: string }[] = [
  { value: 'velocidad', label: 'Velocidad' },
  { value: 'distancia', label: 'Distancia' },
  { value: 'ritmo', label: 'Ritmo' },
];

const str = (n: number | null | undefined, d = 2) => (n == null ? '' : fmtNum(n, d).replace(/\./g, ''));

/**
 * Registrar o editar cardio. Parámetros:
 *  - `workoutId`: vincular a la sesión de fuerza en curso.
 *  - `id`: editar un registro existente.
 *  - `fromWe` (+ `type`, `date`, `min`): convertir en cardio un ejercicio de cardio
 *    que se registró como series dentro de un entreno.
 */
export default function NuevoCardio() {
  const params = useLocalSearchParams<{ workoutId?: string; id?: string; fromWe?: string; type?: string; date?: string; min?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const [type, setType] = useState<string>(params.type ?? CARDIO_TYPES[0]);
  const [minutes, setMinutes] = useState(params.min ?? '');
  const [mode, setMode] = useState<PaceInput>('velocidad');
  const [speed, setSpeed] = useState('');
  const [km, setKm] = useState('');
  const [pace, setPace] = useState('');
  const [incline, setIncline] = useState('');
  const [intensity, setIntensity] = useState<CardioIntensity>('moderada');
  const [steps, setSteps] = useState('');
  const [date, setDate] = useState(params.date ?? toISODate());
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!editId) return;
    getCardio(db, editId).then((c) => {
      if (!c) return;
      setType(c.type);
      setMinutes(str(c.durationMin, 1));
      if (c.distanceKm != null) {
        setMode('distancia');
        setKm(str(c.distanceKm));
      } else if (c.speedKmh != null) setSpeed(str(c.speedKmh, 1));
      setIncline(str(c.inclinePct, 1));
      if (c.intensity) setIntensity(c.intensity);
      setSteps(c.steps != null ? String(c.steps) : '');
      setDate(c.date);
      setNotes(c.notes ?? '');
      setLoaded(true);
    });
  }, [editId]);

  const { data: bodyKg } = useAsyncQuery(`cardio-kg-${date}`, () => bodyKgAt(db, isValidISODate(date) ? date : toISODate()));

  const paced = isPacedType(type);
  const incl = hasIncline(type);
  const min = parseDecimal(minutes);
  const speedN = parseDecimal(speed);
  const kmN = parseDecimal(km);
  const paceN = parseDecimal(pace);
  const inclineN = parseDecimal(incline);
  const stepsN = parseDecimal(steps);
  const errors = {
    minutes: min == null || min <= 0 || min > 600 ? 'Entre 1 y 600 minutos' : null,
    speed: speed && (speedN == null || speedN <= 0 || speedN > 30) ? 'Entre 0,5 y 30 km/h' : null,
    km: km && (kmN == null || kmN <= 0 || kmN > 300) ? 'Distancia no válida' : null,
    pace: pace && (paceN == null || paceN < 2 || paceN > 30) ? 'Entre 2 y 30 min/km' : null,
    incline: incline && (inclineN == null || inclineN < 0 || inclineN > 40) ? 'Entre 0 y 40 %' : null,
    steps: steps && (stepsN == null || stepsN < 0 || !Number.isInteger(stepsN)) ? 'Número entero' : null,
    date: !isValidISODate(date) ? 'Formato AAAA-MM-DD' : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const speedKmh = paced ? speedFrom({ mode, durationMin: min ?? 0, speedKmh: speedN, distanceKm: kmN, paceMinKm: paceN }) : null;
  const distanceKm = mode === 'distancia' && kmN ? kmN : !paced && kmN ? kmN : null;
  const est =
    min && min > 0 && bodyKg
      ? estimateCardio({ type, durationMin: min, bodyKg, speedKmh, inclinePct: incl ? inclineN : null, intensity: paced && speedKmh ? null : intensity })
      : null;

  const save = async () => {
    const input: CardioInput = {
      date,
      type,
      durationMin: min!,
      steps: steps ? stepsN : null,
      distanceKm,
      speedKmh,
      inclinePct: incl && incline ? inclineN : null,
      intensity: paced && speedKmh ? null : intensity,
      notes,
      workoutId: params.workoutId ? Number(params.workoutId) : null,
    };
    const res = editId
      ? await updateCardio(db, editId, input)
      : params.fromWe
        ? await convertExerciseToCardio(db, Number(params.fromWe), input)
        : await addCardio(db, input);
    router.back();
    showAlert(
      editId ? 'Cardio actualizado' : 'Cardio guardado',
      `${type} · ${fmtNum(min!, 0)} min\n≈ ${fmtNum(res.kcal ?? 0, 0)} kcal (estimación ±15-25 %)${res.estimate ? `\n\n${res.estimate.detail}` : ''}`,
    );
  };

  if (!loaded) return null;

  return (
    <Screen>
      <Stack.Screen options={{ title: editId ? 'Editar cardio' : params.fromWe ? 'Registrar como cardio' : 'Registrar cardio' }} />
      <SectionTitle>Tipo</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {CARDIO_TYPES.map((t) => (
          <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
        ))}
      </Row>
      <Field label="Duración" suffix="min" keyboardType="decimal-pad" value={minutes} onChangeText={setMinutes} error={minutes ? errors.minutes : null} />

      {paced ? (
        <>
          <Segmented options={PACE_OPTIONS} value={mode} onChange={setMode} />
          <Row align="flex-start">
            <View style={{ flex: 1 }}>
              {mode === 'velocidad' ? (
                <Field label="Velocidad" suffix="km/h" keyboardType="decimal-pad" value={speed} onChangeText={setSpeed} error={errors.speed} placeholder="5,5" />
              ) : mode === 'distancia' ? (
                <Field
                  label="Distancia"
                  suffix="km"
                  keyboardType="decimal-pad"
                  value={km}
                  onChangeText={setKm}
                  error={errors.km}
                  hint={speedKmh && mode === 'distancia' ? `${fmtNum(speedKmh, 1)} km/h de media` : undefined}
                />
              ) : (
                <Field
                  label="Ritmo"
                  suffix="min/km"
                  keyboardType="decimal-pad"
                  value={pace}
                  onChangeText={setPace}
                  error={errors.pace}
                  placeholder="6,5"
                  hint={speedKmh && mode === 'ritmo' ? `${fmtNum(speedKmh, 1)} km/h` : undefined}
                />
              )}
            </View>
            {incl ? (
              <View style={{ flex: 1 }}>
                <Field label="Pendiente" suffix="%" keyboardType="decimal-pad" value={incline} onChangeText={setIncline} error={errors.incline} placeholder="0" />
              </View>
            ) : null}
          </Row>
          {!speedKmh ? (
            <Txt variant="caption" color={colors.textFaint}>
              Sin velocidad se estima por intensidad. Con velocidad (y pendiente) el cálculo es más preciso.
            </Txt>
          ) : null}
        </>
      ) : null}

      {!paced || !speedKmh ? (
        <>
          <SectionTitle>Intensidad</SectionTitle>
          <Segmented options={INTENSITIES.map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))} value={intensity} onChange={setIntensity} />
        </>
      ) : null}

      <Row align="flex-start">
        <View style={{ flex: 1 }}>
          <Field label="Pasos (opcional)" keyboardType="number-pad" value={steps} onChangeText={setSteps} error={errors.steps} />
        </View>
        {!paced ? (
          <View style={{ flex: 1 }}>
            <Field label="Distancia (opcional)" suffix="km" keyboardType="decimal-pad" value={km} onChangeText={setKm} error={errors.km} />
          </View>
        ) : null}
      </Row>
      <Field label="Fecha" value={date} onChangeText={setDate} error={errors.date} />
      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="label" color={colors.textDim}>
              Gasto estimado
            </Txt>
            <Txt variant="h2" color={colors.accentText}>
              {est ? `≈ ${fmtNum(est.kcal, 0)} kcal` : '—'}
            </Txt>
            <Txt variant="caption" color={colors.textFaint}>
              {est ? `${est.method === 'acsm' ? 'Ecuación ACSM' : `MET ${fmtNum(est.met, 1)}`} · ${fmtNum(bodyKg ?? 0, 1)} kg · ±15-25 %` : 'Indica la duración'}
            </Txt>
          </View>
          <IconButton
            name="information-outline"
            label="Cómo se calculan las kcal del cardio"
            color={colors.textDim}
            onPress={() => showAlert('¿Cómo se calcula?', `${est ? `${est.detail}\n\n` : ''}${CARDIO_EXPLANATION}`)}
          />
        </Row>
      </Card>

      {params.workoutId ? (
        <Txt variant="small" color={colors.textDim}>
          Se vinculará a la sesión de fuerza en curso.
        </Txt>
      ) : null}
      {params.fromWe ? (
        <Txt variant="small" color={colors.textDim}>
          Se quitará del entreno como ejercicio de fuerza y se guardará como cardio de ese día.
        </Txt>
      ) : null}
      <BigButton title={editId ? 'Guardar cambios' : 'Guardar cardio'} icon="content-save" onPress={save} disabled={invalid} />
    </Screen>
  );
}
