import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import type { Profile } from '@/db/schema';
import { ACTIVITY_LABELS, type ActivityLevel } from '@/domain/energy';
import { formatDateLong, toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { useAsyncQuery, useProfile } from '@/hooks/useDb';
import { adjustmentHistoryQuery, energyStatus } from '@/repositories/energy';
import { updateProfile } from '@/repositories/profile';
import { Banner, BigButton, Card, Chip, Field, Row, SectionTitle, Screen, Segmented, Txt } from '@/ui/components';
import { ESTIMATE_DISCLAIMER, TargetNotices } from '@/ui/EnergyCard';
import { colors, space } from '@/ui/theme';

const LEVELS: ActivityLevel[] = ['sedentario', 'ligero', 'activo'];
const RATES = [0.25, 0.5, 0.75, 1];
const PROTEIN = [1.6, 1.8, 2, 2.2, 2.4];
const FAT = [0.6, 0.7, 0.8, 1];
const c = (n: number) => fmtNum(n, 2);

export default function AjustesNutricion() {
  const p = useProfile();
  return p ? <NutricionForm p={p} /> : null;
}

function NutricionForm({ p }: { p: Profile }) {
  const today = toISODate();
  const { data: s } = useAsyncQuery(`energy-settings-${today}`, () => energyStatus(db, today));
  const { data: history } = useLiveQuery(adjustmentHistoryQuery(db));
  const [manual, setManual] = useState(p.kcalTargetManual != null ? String(p.kcalTargetManual) : '');
  const manualN = parseDecimal(manual);
  const manualError = manual && (manualN == null || manualN < 800 || manualN > 6000 || !Number.isInteger(manualN)) ? 'Entre 800 y 6.000 kcal' : null;

  return (
    <Screen>
      <Banner kind="info">{ESTIMATE_DISCLAIMER}</Banner>
      {s?.missing.length ? <Banner kind="warning">{`Falta tu ${s.missing.join(' y ')} en Perfil para calcular el gasto basal.`}</Banner> : null}

      <SectionTitle>Actividad fuera del gimnasio</SectionTitle>
      <Segmented options={LEVELS.map((l) => ({ value: l, label: ACTIVITY_LABELS[l].label }))} value={p.activityLevel} onChange={(v) => updateProfile(db, { activityLevel: v })} />
      <Txt variant="caption" color={colors.textFaint}>
        {ACTIVITY_LABELS[p.activityLevel].hint} Los entrenos y el cardio se suman aparte.
      </Txt>

      <SectionTitle>Ritmo de pérdida</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label={`Según objetivo${s && p.targetRateKgWeek == null ? ` (${c(s.rateKgWeek)})` : ''}`} active={p.targetRateKgWeek == null} onPress={() => updateProfile(db, { targetRateKgWeek: null })} />
        {RATES.map((r) => (
          <Chip key={r} label={`${c(r)} kg/sem`} active={p.targetRateKgWeek === r} onPress={() => updateProfile(db, { targetRateKgWeek: r })} />
        ))}
      </Row>
      <Txt variant="caption" color={colors.textFaint}>
        0,5 kg/sem ≈ 550 kcal/día de déficit; 0,75 ≈ 825. El déficit nunca pasa del 25 % de tu gasto.
      </Txt>

      {s?.target ? (
        <Card>
          <Row align="flex-start">
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={colors.textDim}>
                Gasto de un día medio
              </Txt>
              <Txt variant="h2">{`~${fmtNum(s.target.expectedTdee, 0)} kcal`}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={colors.textDim}>
                Objetivo
              </Txt>
              <Txt variant="h2" color={colors.accentText}>{`${fmtNum(s.target.targetKcal, 0)} kcal`}</Txt>
            </View>
          </Row>
          <Txt variant="caption" color={colors.textFaint}>
            {`Basal ${fmtNum(s.bmr ?? 0, 0)} kcal · factor ${fmtNum(s.factor, 2)} · suelo ${fmtNum(s.target.floorKcal, 0)} kcal · pérdida esperada ~${c(s.target.expectedRateKgWeek)} kg/sem`}
          </Txt>
          <TargetNotices status={s} />
        </Card>
      ) : null}

      <SectionTitle>Objetivo manual (opcional)</SectionTitle>
      <Field
        label="Kcal al día"
        suffix="kcal"
        keyboardType="number-pad"
        value={manual}
        onChangeText={setManual}
        error={manualError}
        hint="Déjalo vacío para usar el calculado."
      />
      <Row gap={space.sm}>
        <BigButton
          title="Guardar"
          icon="content-save"
          style={{ flex: 1 }}
          disabled={!!manualError}
          onPress={() => updateProfile(db, { kcalTargetManual: manual ? manualN : null })}
        />
        {p.kcalTargetManual != null ? (
          <BigButton
            title="Usar calculado"
            icon="calculator-variant-outline"
            kind="secondary"
            style={{ flex: 1 }}
            onPress={() => {
              setManual('');
              updateProfile(db, { kcalTargetManual: null });
            }}
          />
        ) : null}
      </Row>

      <SectionTitle>Proteína</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {PROTEIN.map((g) => (
          <Chip key={g} label={`${c(g)} g/kg`} active={Math.abs(p.proteinGPerKg - g) < 0.01} onPress={() => updateProfile(db, { proteinGPerKg: g })} />
        ))}
      </Row>
      <Txt variant="caption" color={colors.textFaint}>
        En déficit con entrenamiento de fuerza se suele recomendar 1,8-2,2 g por kg de peso.
      </Txt>
      <SectionTitle>Grasas mínimas</SectionTitle>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {FAT.map((g) => (
          <Chip key={g} label={`${c(g)} g/kg`} active={Math.abs(p.fatGPerKg - g) < 0.01} onPress={() => updateProfile(db, { fatGPerKg: g })} />
        ))}
      </Row>
      <Txt variant="caption" color={colors.textFaint}>
        {s?.macros ? `Con tu objetivo: proteína ${s.macros.proteinG} g, grasas ${s.macros.fatG} g y el resto hidratos (${s.macros.carbsG} g).` : 'El resto de kcal va a hidratos.'}
      </Txt>

      <SectionTitle>Recalibración del gasto</SectionTitle>
      <Txt variant="small" color={colors.textDim}>
        {p.tdeeAdjustKcal
          ? `Tu gasto estimado lleva un ajuste de ${p.tdeeAdjustKcal > 0 ? '+' : ''}${fmtNum(p.tdeeAdjustKcal, 0)} kcal/día aceptado a partir de tus registros.`
          : 'Con 2-3 semanas registrando comidas y peso, la app compara tu cambio de peso real con el esperado y puede proponerte un ajuste. Nunca se aplica solo.'}
      </Txt>
      {p.tdeeAdjustKcal ? <BigButton title="Quitar recalibración" icon="restore" kind="ghost" onPress={() => updateProfile(db, { tdeeAdjustKcal: 0 })} /> : null}
      {history?.length ? (
        <View style={{ gap: space.xs }}>
          {history.map((h) => (
            <Txt key={h.id} variant="caption" color={colors.textFaint}>
              {`${formatDateLong(h.createdDate)} · ${h.deltaKcal > 0 ? '+' : ''}${fmtNum(h.deltaKcal, 0)} kcal · ${h.status}`}
            </Txt>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
