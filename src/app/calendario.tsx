import { isNotNull, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import { cardioSession, diaryEntry, workout } from '@/db/schema';
import { dayOfMonth, monthGrid, monthTitle, shiftMonth, WEEKDAYS_SHORT } from '@/domain/calendar';
import { formatDateLong, toISODate } from '@/domain/dates';
import { fmtDuration, fmtNum } from '@/domain/format';
import { BigButton, Card, IconButton, ListRow, Row, Screen, Stat, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

export default function Calendario() {
  const today = toISODate();
  const now = new Date();
  const [[year, month], setYm] = useState<[number, number]>([now.getFullYear(), now.getMonth()]);
  const [selected, setSelected] = useState<string>(today);
  const { data: workouts } = useLiveQuery(
    db
      .select({ id: workout.id, date: workout.date, name: workout.name, isDeload: workout.isDeload, startedAt: workout.startedAt, endedAt: workout.endedAt })
      .from(workout)
      .where(isNotNull(workout.endedAt)),
  );
  const { data: cardio } = useLiveQuery(db.select().from(cardioSession));
  const { data: intake } = useLiveQuery(
    db.select({ date: diaryEntry.date, kcal: sql<number>`sum(${diaryEntry.kcal})` }).from(diaryEntry).groupBy(diaryEntry.date),
  );
  const intakeByDate = useMemo(() => new Map((intake ?? []).map((r) => [r.date, r.kcal])), [intake]);

  const byDate = useMemo(() => {
    const m = new Map<string, { workouts: NonNullable<typeof workouts>; cardio: NonNullable<typeof cardio> }>();
    for (const w of workouts ?? []) {
      const e = m.get(w.date) ?? { workouts: [], cardio: [] };
      e.workouts.push(w);
      m.set(w.date, e);
    }
    for (const c of cardio ?? []) {
      const e = m.get(c.date) ?? { workouts: [], cardio: [] };
      e.cardio.push(c);
      m.set(c.date, e);
    }
    return m;
  }, [workouts, cardio]);

  const grid = monthGrid(year, month);
  const monthDays = grid.flat().filter((d): d is string => !!d);
  const trainedDays = monthDays.filter((d) => byDate.get(d)?.workouts.length).length;
  const cardioMin = monthDays.reduce((a, d) => a + (byDate.get(d)?.cardio.reduce((s, c) => s + c.durationMin, 0) ?? 0), 0);
  const sel = byDate.get(selected);
  const selIntake = intakeByDate.get(selected);
  const intakeDays = monthDays.filter((d) => intakeByDate.has(d)).length;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton name="chevron-left" label="Mes anterior" onPress={() => setYm(shiftMonth(year, month, -1))} />
        <Txt variant="h2">{monthTitle(year, month)}</Txt>
        <IconButton name="chevron-right" label="Mes siguiente" onPress={() => setYm(shiftMonth(year, month, 1))} />
      </Row>

      <Card style={{ paddingHorizontal: space.sm }}>
        <View style={styles.week}>
          {WEEKDAYS_SHORT.map((d) => (
            <Txt key={d} variant="label" color={colors.textFaint} style={styles.headCell}>
              {d}
            </Txt>
          ))}
        </View>
        {grid.map((week, i) => (
          <View key={i} style={styles.week}>
            {week.map((d, j) => {
              if (!d) return <View key={j} style={styles.cell} />;
              const info = byDate.get(d);
              const trained = !!info?.workouts.length;
              const deload = trained && info!.workouts.every((w) => w.isDeload);
              const isSel = d === selected;
              return (
                <Pressable key={d} style={styles.cell} onPress={() => setSelected(d)} accessibilityLabel={`${formatDateLong(d)}${trained ? ', entrenado' : ''}`}>
                  <View
                    style={[
                      styles.day,
                      trained && !deload && { backgroundColor: colors.accent },
                      deload && { borderWidth: 2, borderColor: colors.accent },
                      d === today && !trained && { borderWidth: 1, borderColor: colors.textDim },
                      isSel && { transform: [{ scale: 1.12 }], borderWidth: 2, borderColor: colors.text },
                    ]}>
                    <Txt variant="bodyBold" color={trained && !deload ? colors.onAccent : d > today ? colors.textFaint : colors.text}>
                      {String(dayOfMonth(d))}
                    </Txt>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    <View style={[styles.dot, { backgroundColor: info?.cardio.length ? colors.warning : 'transparent' }]} />
                    <View style={[styles.dot, { backgroundColor: intakeByDate.has(d) ? colors.success : 'transparent' }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Row gap={space.lg} style={{ flexWrap: 'wrap', paddingHorizontal: space.sm }}>
          <Legend color={colors.accent} label="Entreno" />
          <Legend color={colors.accent} label="Descarga" outline />
          <Legend color={colors.warning} label="Cardio" dot />
          <Legend color={colors.success} label="Comidas" dot />
        </Row>
      </Card>

      <Card>
        <Row align="flex-start">
          <Stat label="Días entrenados" value={String(trainedDays)} color={colors.accentText} />
          <Stat label="Cardio" value={`${fmtNum(cardioMin, 0)} min`} />
          <Stat label="Comidas" value={String(intakeDays)} sub="días registrados" />
        </Row>
      </Card>

      <Txt variant="h3">{formatDateLong(selected)}</Txt>
      {selIntake != null ? (
        <ListRow icon="food-apple-outline" title={`Comidas · ${fmtNum(selIntake, 0)} kcal`} subtitle="Registradas en el diario" onPress={() => router.push('/nutricion')} />
      ) : null}
      {sel && (sel.workouts.length || sel.cardio.length) ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {sel.workouts.map((w) => (
            <ListRow
              key={`w${w.id}`}
              icon="dumbbell"
              title={w.name}
              subtitle={fmtDuration(((w.endedAt ?? w.startedAt) - w.startedAt) / 1000)}
              onPress={() => router.push({ pathname: '/sesion/resumen/[id]', params: { id: w.id } })}
            />
          ))}
          {sel.cardio.map((c) => (
            <ListRow key={`c${c.id}`} icon="run" title={`${c.type} · ${fmtNum(c.durationMin, 0)} min`} subtitle={c.distanceKm != null ? `${fmtNum(c.distanceKm, 2)} km` : undefined} />
          ))}
        </View>
      ) : (
        <Txt color={colors.textDim}>{selected > today ? 'Día futuro.' : 'Sin entrenos ni cardio.'}</Txt>
      )}
      <BigButton title="Recordatorios de entreno" icon="bell-outline" kind="secondary" onPress={() => router.push('/ajustes/recordatorios')} />
    </Screen>
  );
}

function Legend({ color, label, outline, dot }: { color: string; label: string; outline?: boolean; dot?: boolean }) {
  return (
    <Row gap={space.xs}>
      <View
        style={
          dot
            ? { width: 6, height: 6, borderRadius: 3, backgroundColor: color }
            : { width: 14, height: 14, borderRadius: 7, backgroundColor: outline ? 'transparent' : color, borderWidth: outline ? 2 : 0, borderColor: color }
        }
      />
      <Txt variant="caption" color={colors.textDim}>
        {label}
      </Txt>
    </Row>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  headCell: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
