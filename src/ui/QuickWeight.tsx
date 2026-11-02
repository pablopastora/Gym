import * as Haptics from 'expo-haptics';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { currentTrend, prefillWeight } from '@/domain/body';
import { toISODate } from '@/domain/dates';
import { fmtNum, parseDecimal } from '@/domain/format';
import { useProfile } from '@/hooks/useDb';
import { upsertWeight, weightsQuery } from '@/repositories/body';

import { Icon, Txt } from './components';
import { colors, fonts, radius, space, TOUCH } from './theme';

/**
 * Registro rápido del peso en Inicio: viene rellenado con el último peso
 * (el de ayer) y se guarda con un toque. Si hoy ya está, se puede corregir.
 */
export function QuickWeight() {
  const { data } = useLiveQuery(weightsQuery(db));
  const profile = useProfile();
  if (!data || !profile) return null;
  return <QuickWeightForm key={data.length} entries={data} fallbackKg={profile.startWeightKg} />;
}

function QuickWeightForm({ entries, fallbackKg }: { entries: { date: string; weightKg: number }[]; fallbackKg: number }) {
  const today = toISODate();
  const found = prefillWeight(entries, today);
  // Sin registros previos: se rellena con el peso inicial del perfil.
  const pre = found.value == null ? { value: fallbackKg, isToday: false } : found;
  const [text, setText] = useState(pre.value != null ? fmtNum(pre.value, 2) : '');
  const [savedNow, setSavedNow] = useState(false);
  const value = parseDecimal(text);
  const valid = value != null && value >= 35 && value <= 300;
  const trend = currentTrend(entries, today);

  const save = async () => {
    if (!valid) return;
    await upsertWeight(db, today, Math.round(value! * 100) / 100);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSavedNow(true);
  };

  const done = pre.isToday || savedNow;

  return (
    <View style={[styles.card, done && { borderColor: colors.border }]}>
      <View style={styles.head}>
        <Txt variant="label" color={done ? colors.textDim : colors.accentText}>
          {done ? 'Peso de hoy · guardado' : 'Peso de hoy'}
        </Txt>
        <Pressable onPress={() => router.push('/cuerpo/peso')} hitSlop={8} accessibilityRole="button">
          <Txt variant="caption" color={colors.textDim}>
            {trend != null ? `Tendencia 7 días: ${fmtNum(trend, 1)} kg  ›` : 'Historial  ›'}
          </Txt>
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setSavedNow(false);
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder="0,0"
            placeholderTextColor={colors.textFaint}
            cursorColor={colors.accentText}
            onSubmitEditing={save}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="Peso de hoy en kilos"
          />
          <Txt variant="display" color={colors.textDim}>
            kg
          </Txt>
        </View>
        <Pressable
          onPress={save}
          disabled={!valid}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: done && !pressed ? colors.surface2 : pressed ? colors.accentPressed : colors.accent, opacity: valid ? 1 : 0.4 },
          ]}>
          {done ? <Icon name="check-bold" color={colors.accentText} /> : null}
          <Txt variant="button" color={done ? colors.text : colors.onAccent}>
            {done ? 'Guardado' : 'Guardar'}
          </Txt>
        </Pressable>
      </View>
      {!pre.isToday && !savedNow && pre.value != null ? (
        <Txt variant="caption" color={colors.textFaint}>
          {entries.length ? 'Rellenado con tu último peso. Cámbialo si hace falta y guarda.' : 'Rellenado con tu peso inicial. Cámbialo si hace falta y guarda.'}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: space.lg,
    gap: space.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: TOUCH + 8,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 44, paddingVertical: 0 },
  btn: {
    minWidth: 128,
    height: TOUCH + 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.lg,
  },
});
