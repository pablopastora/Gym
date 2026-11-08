import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { View } from 'react-native';

import { db } from '@/db/client';
import { ENERGY_EXPLANATION } from '@/domain/energy';
import { fmtNum } from '@/domain/format';
import { useAsyncQuery } from '@/hooks/useDb';
import { decideAdjustment, energyStatus, pendingAdjustmentQuery, type EnergyStatus } from '@/repositories/energy';
import { updateProfile } from '@/repositories/profile';

import { showAlert } from './alert';
import { Banner, BigButton, Card, IconButton, Row, Stat, Txt } from './components';
import { colors, space } from './theme';

export const ESTIMATE_DISCLAIMER = 'Estimaciones orientativas, no consejo médico ni nutricional personalizado.';

const k = (n: number) => fmtNum(Math.round(n), 0);

/** Avisos sobre el objetivo calórico (suelo de seguridad, déficit limitado). Tono neutro. */
export function TargetNotices({ status }: { status: EnergyStatus }) {
  const t = status.target;
  if (!t) return null;
  return (
    <>
      {t.manualBelowFloor ? (
        <Banner kind="warning">
          {`Tu objetivo manual (${k(t.targetKcal)} kcal) queda por debajo de tu metabolismo basal o de 1.500 kcal (${k(t.floorKcal)}). Te proponemos ${k(t.suggestedKcal)} kcal, un déficit más suave y sostenible.`}
        </Banner>
      ) : null}
      {t.manualBelowFloor ? (
        <BigButton
          title={`Usar ${k(t.suggestedKcal)} kcal`}
          icon="check"
          kind="secondary"
          onPress={() => updateProfile(db, { kcalTargetManual: null })}
        />
      ) : null}
      {t.raisedToFloor ? (
        <Banner kind="info">{`Con tu ritmo, el objetivo quedaría por debajo de tu basal o de 1.500 kcal, así que se usa ${k(t.targetKcal)} kcal (un ritmo algo más lento).`}</Banner>
      ) : null}
      {t.cappedDeficit && !t.raisedToFloor && !t.isManual ? (
        <Txt variant="caption" color={colors.textFaint}>
          El déficit se limita al 25 % de tu gasto para cuidar el músculo y la energía.
        </Txt>
      ) : null}
    </>
  );
}

/** Tarjeta «Ajuste sugerido»: nunca se aplica sola. */
export function AdjustmentCard() {
  const { data } = useLiveQuery(pendingAdjustmentQuery(db));
  const a = data?.[0];
  if (!a) return null;
  const up = a.deltaKcal > 0;
  return (
    <Card style={{ borderColor: colors.border, borderWidth: 1 }}>
      <Txt variant="label" color={colors.accentText}>
        Ajuste sugerido
      </Txt>
      <Txt>
        {`En las últimas 3 semanas has comido una media de ${k(a.avgIntake)} kcal (${a.loggedDays} días registrados) y tu peso medio ha cambiado ${a.weightChangeKg > 0 ? '+' : ''}${fmtNum(a.weightChangeKg, 2)} kg. ` +
          `Eso encaja mejor con un gasto de ~${k(a.observedTdee)} kcal que con los ~${k(a.avgEstimated)} estimados.`}
      </Txt>
      <Txt variant="small" color={colors.textDim}>
        {`Propuesta: ${up ? 'subir' : 'bajar'} tu gasto estimado ${k(Math.abs(a.deltaKcal))} kcal/día (y con él tu objetivo). Solo se aplica si lo aceptas.`}
      </Txt>
      <Row gap={space.sm}>
        <BigButton title="Aceptar" icon="check" style={{ flex: 1 }} onPress={() => decideAdjustment(db, a.id, true)} />
        <BigButton title="Rechazar" icon="close" kind="secondary" style={{ flex: 1 }} onPress={() => decideAdjustment(db, a.id, false)} />
      </Row>
    </Card>
  );
}

/** Gasto estimado de hoy y objetivo calórico. Si faltan edad o sexo, los pide. */
export function EnergyCard({ today, consumedKcal }: { today: string; consumedKcal?: number | null }) {
  const { data: s } = useAsyncQuery(`energy-${today}`, () => energyStatus(db, today));
  if (!s) return null;
  if (s.missing.length) {
    return (
      <Card>
        <Txt variant="label" color={colors.textDim}>
          Gasto y objetivo calórico
        </Txt>
        <Banner kind="info">
          {`Para calcular tu gasto basal y tu objetivo necesito tu ${s.missing.join(' y ')}. No se usan valores inventados.`}
        </Banner>
        <BigButton title="Completar perfil" icon="account-edit-outline" kind="secondary" onPress={() => router.push('/ajustes/perfil')} />
      </Card>
    );
  }
  const d = s.today!;
  const t = s.target!;
  const m = s.macros!;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="label" color={colors.textDim}>
          Energía de hoy
        </Txt>
        <IconButton name="information-outline" label="Cómo se calcula el gasto" color={colors.textDim} onPress={() => showAlert('¿Cómo se calcula?', ENERGY_EXPLANATION)} />
      </Row>
      <Row align="flex-start">
        <Stat label="Gasto" value={`~${k(d.total)}`} sub="kcal estimadas" />
        <Stat label="Objetivo" value={`${k(t.targetKcal)}`} sub={t.isManual ? 'kcal (manual)' : `kcal · −${k(t.deficitKcal)}`} color={colors.accentText} />
        {consumedKcal != null ? <Stat label="Comido" value={k(consumedKcal)} sub="kcal" /> : null}
      </Row>
      <Txt variant="caption" color={colors.textFaint}>
        {`Basal ${k(d.bmr)} · actividad ${k(d.neat)} · ejercicio +${k(d.exerciseNet)} neto (${k(d.exerciseGross)} brutas)${d.adjust ? ` · recalibración ${d.adjust > 0 ? '+' : ''}${k(d.adjust)}` : ''}`}
      </Txt>
      <View style={{ gap: 2 }}>
        <Txt variant="small" color={colors.textDim}>
          {`Proteína ${m.proteinG} g · Grasas ${m.fatG} g · Hidratos ${m.carbsG} g`}
        </Txt>
        <Txt variant="caption" color={colors.textFaint}>
          {`Ritmo ${fmtNum(s.rateKgWeek, 2)} kg/sem${s.rateIsAuto ? ' (según tu objetivo)' : ''} · ${ESTIMATE_DISCLAIMER}`}
        </Txt>
      </View>
      <TargetNotices status={s} />
    </Card>
  );
}
