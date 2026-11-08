import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey } from '@/db/schema';
import { addDays, formatDateLong } from '@/domain/dates';
import { ENERGY_EXPLANATION, LOW_INTAKE_DAYS, lowIntakeStreak } from '@/domain/energy';
import { fmtNum } from '@/domain/format';
import { MEAL_LABEL, MEALS, sumMacros } from '@/domain/nutrition';
import { useAsyncQuery } from '@/hooks/useDb';
import { useToday } from '@/hooks/useToday';
import { checkEnergyAdjustment, copyEntries, dayEntriesQuery, deleteEntry, intakeByDay, recentMeals, type DiaryEntry } from '@/repositories/diary';
import { energyStatus } from '@/repositories/energy';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, Icon, IconButton, ListRow, Row, SectionTitle, Screen, Stat, Txt } from '@/ui/components';
import { AdjustmentCard, ESTIMATE_DISCLAIMER, TargetNotices } from '@/ui/EnergyCard';
import { MacroBar } from '@/ui/nutrition/MacroBar';
import { shareDayPlan } from '@/ui/nutrition/shareDay';
import { WeeklyIntake } from '@/ui/nutrition/WeeklyIntake';
import { chart, colors, radius, space } from '@/ui/theme';

const k = (n: number) => fmtNum(Math.round(n), 0);

export default function Nutricion() {
  const today = useToday();
  // Día mostrado relativo a hoy: si cambia el día con la app abierta, sigue siendo «hoy».
  const [offset, setOffset] = useState(0);
  const date = addDays(today, offset);
  const { data: entries } = useLiveQuery(dayEntriesQuery(db, date), [date]);
  const { data: energy } = useAsyncQuery(`energy-day-${date}`, () => energyStatus(db, date));
  const { data: lastDays } = useAsyncQuery(`intake-last-${today}`, () => intakeByDay(db, addDays(today, -14), addDays(today, -1)));
  const [menu, setMenu] = useState<DiaryEntry | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const { data: copyFrom } = useAsyncQuery(`recent-meals-${date}-${copyOpen}`, () => (copyOpen ? recentMeals(db, date) : Promise.resolve([])));

  // Revisar (una vez por día y pantalla) si hay datos para proponer recalibrar el gasto.
  useEffect(() => {
    checkEnergyAdjustment(db, today).catch(() => undefined);
  }, [today]);

  const total = useMemo(() => sumMacros(entries ?? []), [entries]);
  const byMeal = useMemo(() => {
    const m = new Map<MealKey, DiaryEntry[]>();
    for (const e of entries ?? []) m.set(e.meal, [...(m.get(e.meal) ?? []), e]);
    return m;
  }, [entries]);

  const target = energy?.target?.targetKcal ?? null;
  const spent = energy?.today?.total ?? null;
  const macros = energy?.macros ?? null;
  const isToday = date === today;
  const lowStreak =
    isToday && energy?.target && lastDays
      ? lowIntakeStreak({ today, intakeByDate: new Map([...lastDays].map(([d, m]) => [d, m.kcal])), floorKcal: energy.target.floorKcal })
      : 0;

  const add = (meal: MealKey) => router.push({ pathname: '/comida/anadir', params: { date, meal } });

  const copyYesterday = async () => {
    const n = await copyEntries(db, { fromDate: addDays(date, -1), toDate: date });
    showAlert(n ? 'Copiado' : 'Nada que copiar', n ? `${n} alimentos de ayer añadidos.` : 'El día anterior no tiene comidas registradas.');
  };

  const entryActions: SheetAction[] = menu
    ? [
        {
          label: 'Editar',
          icon: 'pencil-outline',
          onPress: () =>
            menu.foodId
              ? router.push({ pathname: '/comida/cantidad', params: { entryId: menu.id, foodId: menu.foodId, date, meal: menu.meal } })
              : router.push({ pathname: '/comida/rapidas', params: { entryId: menu.id, date, meal: menu.meal } }),
        },
        {
          label: 'Borrar',
          icon: 'delete-outline',
          destructive: true,
          onPress: () => deleteEntry(db, menu.id),
        },
      ]
    : [];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton name="chevron-left" label="Día anterior" onPress={() => setOffset(offset - 1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h3">{isToday ? 'Hoy' : formatDateLong(date)}</Txt>
          {isToday ? (
            <Txt variant="caption" color={colors.textFaint}>
              {formatDateLong(date)}
            </Txt>
          ) : null}
        </View>
        <IconButton name="chevron-right" label="Día siguiente" onPress={() => setOffset(offset + 1)} />
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="label" color={colors.textDim}>
            Resumen del día
          </Txt>
          <IconButton name="information-outline" label="Cómo se calcula" color={colors.textDim} onPress={() => showAlert('¿Cómo se calcula?', ENERGY_EXPLANATION)} />
        </Row>
        <Row align="flex-start">
          <Stat label="Comido" value={k(total.kcal)} sub={target ? `de ${k(target)} kcal` : 'kcal'} color={colors.accentText} />
          <Stat label="Gastado" value={spent != null ? `~${k(spent)}` : '—'} sub="kcal estimadas" />
          <Stat
            label="Balance"
            value={spent != null ? `${total.kcal - spent > 0 ? '+' : '−'}${k(Math.abs(total.kcal - spent))}` : '—'}
            sub={spent != null ? `${total.kcal - spent < 0 ? 'kcal de déficit' : 'kcal de superávit'}${isToday ? ' (por ahora)' : ''}` : 'kcal'}
          />
        </Row>
        {target ? <MacroBar label="Kcal" value={total.kcal} target={target} unit="kcal" color={chart.primary} /> : null}
        <MacroBar label="Proteína" value={total.protein} target={macros?.proteinG ?? null} color={chart.secondary} />
        <MacroBar label="Hidratos" value={total.carbs} target={macros?.carbsG ?? null} color={chart.tertiary} />
        <MacroBar label="Grasas" value={total.fat} target={macros?.fatG ?? null} color={chart.tertiary} />
        {target ? (
          <Txt variant="small" color={colors.textDim}>
            {total.kcal <= target ? `Te quedan ${k(target - total.kcal)} kcal y ${k(Math.max(0, (macros?.proteinG ?? 0) - total.protein))} g de proteína.` : `Llevas ${k(total.kcal - target)} kcal por encima del objetivo de hoy.`}
          </Txt>
        ) : null}
        {energy?.today ? (
          <Txt variant="caption" color={colors.textFaint}>
            {`Gasto: basal ${k(energy.today.bmr)} + actividad ${k(energy.today.neat)} + entrenos y cardio ${k(energy.today.exerciseNet)} (netas)${energy.today.adjust ? ` ${energy.today.adjust > 0 ? '+' : '−'} ${k(Math.abs(energy.today.adjust))} recalibración` : ''}`}
          </Txt>
        ) : null}
        {energy?.missing.length ? (
          <Banner kind="info">{`Para calcular el gasto y el objetivo, completa tu ${energy.missing.join(' y ')} en Ajustes → Perfil.`}</Banner>
        ) : null}
        {energy ? <TargetNotices status={energy} /> : null}
      </Card>

      {lowStreak >= LOW_INTAKE_DAYS ? (
        <Banner kind="info">
          {`Los últimos ${lowStreak} días has registrado bastante menos de tu mínimo recomendado (${k(energy!.target!.floorKcal)} kcal). Si ha sido así, intenta no bajar de ese mínimo para cuidar tu energía y tu músculo, y si lo necesitas consulta con un profesional sanitario o dietista. Si es que no apuntaste todo, ignora este aviso.`}
        </Banner>
      ) : null}

      <AdjustmentCard />

      <Row gap={space.sm}>
        <BigButton title="¿Qué como?" icon="lightbulb-on-outline" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => router.push({ pathname: '/comida/sugerencias', params: { date } })} />
        <BigButton title="Compartir" icon="share-variant-outline" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => shareDayPlan(date)} />
      </Row>

      {MEALS.map((m) => {
        const list = byMeal.get(m.key) ?? [];
        const sub = sumMacros(list);
        return (
          <View key={m.key} style={{ gap: space.sm }}>
            <SectionTitle right={<IconButton name="plus" label={`Añadir a ${m.label}`} color={colors.accentText} onPress={() => add(m.key)} />}>
              {list.length ? `${m.label} · ${k(sub.kcal)} kcal` : m.label}
            </SectionTitle>
            {list.length ? (
              <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
                {list.map((e) => (
                  <ListRow
                    key={e.id}
                    title={e.name}
                    subtitle={`${e.grams != null ? `${fmtNum(e.grams, 0)} g · ` : ''}${k(e.kcal)} kcal · P ${fmtNum(e.protein, 0)} · H ${fmtNum(e.carbs, 0)} · G ${fmtNum(e.fat, 0)}`}
                    right={<Icon name="dots-vertical" color={colors.textFaint} />}
                    onPress={() => setMenu(e)}
                  />
                ))}
              </View>
            ) : (
              <Txt variant="small" color={colors.textFaint}>
                Sin registros.
              </Txt>
            )}
          </View>
        );
      })}

      <Row gap={space.sm}>
        <BigButton title="Copiar ayer" icon="content-copy" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={copyYesterday} />
        <BigButton title="Copiar comida" icon="calendar-import" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => setCopyOpen(true)} />
      </Row>

      <SectionTitle>Semanas: comido frente a gastado</SectionTitle>
      <WeeklyIntake today={today} />

      <Txt variant="caption" color={colors.textFaint}>
        {ESTIMATE_DISCLAIMER}
      </Txt>

      <ActionSheet visible={menu != null} title={menu?.name} actions={entryActions} onClose={() => setMenu(null)} />
      <ActionSheet
        visible={copyOpen}
        title={`Copiar a ${isToday ? 'hoy' : formatDateLong(date)}`}
        actions={(copyFrom ?? []).slice(0, 10).map((c) => ({
          label: `${formatDateLong(c.date)} · ${MEAL_LABEL[c.meal]} · ${k(c.kcal)} kcal`,
          icon: 'content-copy' as const,
          onPress: () => copyEntries(db, { fromDate: c.date, fromMeal: c.meal, toDate: date, toMeal: c.meal }),
        }))}
        onClose={() => setCopyOpen(false)}
      />
    </Screen>
  );
}
