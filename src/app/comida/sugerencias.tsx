import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey } from '@/db/schema';
import { toISODate } from '@/domain/dates';
import { fmtNum } from '@/domain/format';
import { itemText, mealTarget, suggestMeals, type MealOption } from '@/domain/mealPlanner';
import { MEAL_LABEL, MEALS, mealForHour, sumMacros } from '@/domain/nutrition';
import { useAsyncQuery } from '@/hooks/useDb';
import { addFoodEntry, dayEntriesQuery } from '@/repositories/diary';
import { energyStatus } from '@/repositories/energy';
import { getFood } from '@/repositories/foods';
import { plannerFoods } from '@/repositories/mealPlanner';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, Chip, Row, Screen, Segmented, Stat, Txt } from '@/ui/components';
import { ESTIMATE_DISCLAIMER } from '@/ui/EnergyCard';
import { shareDayPlan } from '@/ui/nutrition/shareDay';
import { colors, space } from '@/ui/theme';

type Mode = 'comida' | 'resto';
const k = (n: number) => fmtNum(Math.round(n), 0);

/** «¿Qué como?»: 3 propuestas con raciones calculadas para lo que te queda. */
export default function Sugerencias() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealKey }>();
  const date = params.date ?? toISODate();
  const { data: entries } = useLiveQuery(dayEntriesQuery(db, date), [date]);
  const { data: energy } = useAsyncQuery(`energy-sug-${date}`, () => energyStatus(db, date));
  const { data: foods } = useAsyncQuery('planner-foods', () => plannerFoods(db), { live: false });
  const logged = useMemo(() => [...new Set((entries ?? []).map((e) => e.meal))], [entries]);
  const [meal, setMeal] = useState<MealKey>(() => params.meal ?? mealForHour(new Date().getHours()));
  const [mode, setMode] = useState<Mode>('comida');
  const [rejected, setRejected] = useState<string[]>([]);
  const [replaced, setReplaced] = useState<Record<number, MealOption>>({});
  const [open, setOpen] = useState<number | null>(null);

  const consumed = useMemo(() => sumMacros(entries ?? []), [entries]);
  const target = energy?.target && energy.macros ? { kcal: energy.target.targetKcal, protein: energy.macros.proteinG, fat: energy.macros.fatG, carbs: energy.macros.carbsG } : null;
  const remaining = target ? { kcal: target.kcal - consumed.kcal, protein: Math.max(0, target.protein - consumed.protein), fat: Math.max(0, target.fat - consumed.fat) } : null;
  const almostDone = remaining != null && remaining.kcal < 150;
  const goal = !remaining
    ? null
    : almostDone
      ? { kcal: 200, protein: Math.max(20, Math.min(30, remaining.protein)), fat: 5 }
      : mode === 'resto'
        ? remaining
        : mealTarget({ meal, remaining, loggedMeals: logged });

  const flags = energy?.profile.dietFlags ?? [];
  const base = foods && goal ? suggestMeals({ foods, flags, meal, target: goal, count: 3 }) : [];
  const options = base.map((o, i) => replaced[i] ?? o);

  const another = (idx: number) => {
    const shown = options.map((o) => o.key);
    const nextRejected = [...rejected, ...shown];
    const shownProteins = options.filter((_, i) => i !== idx).map((o) => o.items.find((x) => x.role === 'proteina')?.food.id);
    const cands = suggestMeals({ foods: foods!, flags, meal, target: goal!, count: 6, exclude: new Set(nextRejected) });
    const pick = cands.find((c) => !shownProteins.includes(c.items.find((x) => x.role === 'proteina')?.food.id)) ?? cands[0];
    setRejected(nextRejected);
    if (pick) setReplaced({ ...replaced, [idx]: pick });
    else showAlert('No hay más opciones', 'Marca más alimentos como «me gusta» o «en casa» para tener más variedad.');
  };

  const addToDiary = async (o: MealOption) => {
    for (const it of o.items) {
      const f = await getFood(db, it.food.id);
      if (f) await addFoodEntry(db, { date, meal, food: f, quantity: it.grams, unit: 'g' });
    }
    router.dismissTo('/nutricion');
  };

  return (
    <Screen>
      {energy?.missing.length ? (
        <>
          <Banner kind="info">{`Para calcular lo que te queda, completa tu ${energy.missing.join(' y ')} en el perfil.`}</Banner>
          <BigButton title="Completar perfil" icon="account-edit-outline" kind="secondary" onPress={() => router.push('/ajustes/perfil')} />
        </>
      ) : null}

      {remaining ? (
        <Card>
          <Txt variant="label" color={colors.textDim}>
            Te queda hoy
          </Txt>
          <Row align="flex-start">
            <Stat label="Kcal" value={k(Math.max(0, remaining.kcal))} color={colors.accentText} />
            <Stat label="Proteína" value={k(remaining.protein)} sub="g" />
            <Stat label="Grasas" value={k(remaining.fat)} sub="g" />
          </Row>
        </Card>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {MEALS.map((m) => (
          <Chip
            key={m.key}
            label={`${m.label}${logged.includes(m.key) ? ' ✓' : ''}`}
            active={meal === m.key}
            onPress={() => {
              setMeal(m.key);
              setReplaced({});
              setRejected([]);
            }}
          />
        ))}
      </ScrollView>
      <Segmented
        options={[
          { value: 'comida', label: `Para ${MEAL_LABEL[meal].toLowerCase()}` },
          { value: 'resto', label: 'Todo lo que queda' },
        ]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          setReplaced({});
          setRejected([]);
        }}
      />
      {goal ? (
        <Txt variant="small" color={colors.textDim}>
          {`Objetivo de esta propuesta: ~${k(goal.kcal)} kcal y ${k(goal.protein)} g de proteína. Se prioriza llegar a la proteína y la saciedad (proteína, fibra y volumen).`}
        </Txt>
      ) : null}
      {almostDone ? <Banner kind="info">Ya estás cerca de tu objetivo de hoy. Si tienes hambre, aquí van opciones ligeras y saciantes.</Banner> : null}

      {goal && foods && !options.length ? (
        <Banner kind="info">No hay combinaciones con tus preferencias para esta comida. Marca más alimentos como «me gusta» o «en casa», o revisa las exclusiones.</Banner>
      ) : null}

      {options.map((o, idx) => (
        <Card key={`${o.key}-${idx}`}>
          <Txt variant="label" color={colors.accentText}>{`Opción ${idx + 1}`}</Txt>
          {o.items.map((it) => (
            <Txt key={it.food.id}>{`• ${itemText(it)} · ${k(it.macros.kcal)} kcal`}</Txt>
          ))}
          <Txt variant="small" color={colors.textDim}>
            {`${k(o.total.kcal)} kcal · P ${fmtNum(o.total.protein, 0)} g · H ${fmtNum(o.total.carbs, 0)} g · G ${fmtNum(o.total.fat, 0)} g · fibra ${fmtNum(o.total.fiber, 0)} g`}
          </Txt>
          {open === idx ? (
            <View style={{ gap: space.xs }}>
              {o.steps.map((s, i) => (
                <Txt key={i} variant="small">{`${i + 1}. ${s}`}</Txt>
              ))}
            </View>
          ) : null}
          <BigButton title={open === idx ? 'Ocultar preparación' : 'Ver preparación'} icon="chef-hat" kind="ghost" onPress={() => setOpen(open === idx ? null : idx)} />
          <Row gap={space.sm}>
            <BigButton title="Añadir al diario" icon="plus" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => addToDiary(o)} />
            <BigButton title="Otra opción" icon="refresh" kind="secondary" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={() => another(idx)} />
          </Row>
        </Card>
      ))}

      <BigButton title="Compartir plan del día como texto" icon="share-variant-outline" kind="secondary" onPress={() => shareDayPlan(date)} />
      <BigButton title="Mis preferencias de comida" icon="heart-outline" kind="ghost" onPress={() => router.push('/comida/preferencias')} />
      <Txt variant="caption" color={colors.textFaint}>
        {`Propuestas calculadas en el móvil con plantillas simples (proteína + hidrato + verdura…). Excluye siempre lo marcado como «no me gusta» o alergia. ${ESTIMATE_DISCLAIMER}`}
      </Txt>
    </Screen>
  );
}
