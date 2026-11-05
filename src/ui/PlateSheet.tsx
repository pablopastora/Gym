import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtNum, parseDecimal } from '@/domain/format';
import { DEFAULT_PLATES, formatPlates, plateBreakdown } from '@/domain/plates';

import { BigButton, Field, Row, Txt } from './components';
import { colors, radius, space } from './theme';

/** Calculadora de discos: qué poner en cada lado de la barra. */
export function PlateSheet({
  visible,
  initialKg,
  barKg,
  plates,
  onClose,
}: {
  visible: boolean;
  initialKg: number | null;
  barKg: number;
  plates: number[] | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        {visible ? <PlateBody key={String(initialKg)} initialKg={initialKg} barKg={barKg} plates={plates ?? DEFAULT_PLATES} onClose={onClose} /> : null}
      </View>
    </Modal>
  );
}

function PlateBody({ initialKg, barKg, plates, onClose }: { initialKg: number | null; barKg: number; plates: number[]; onClose: () => void }) {
  const [text, setText] = useState(initialKg != null ? fmtNum(initialKg, 2) : '');
  const target = parseDecimal(text);
  const r = target != null ? plateBreakdown(target, barKg, plates) : null;
  const maxPlate = Math.max(...plates);
  return (
    <View style={{ gap: space.md }}>
      <Txt variant="label" color={colors.textDim}>
        Calculadora de discos
      </Txt>
      <Field label="Peso total" suffix="kg" keyboardType="decimal-pad" value={text} onChangeText={setText} selectTextOnFocus />
      {r ? (
        <>
          <Txt variant="h2">{r.belowBar ? `Menos que la barra (${fmtNum(barKg, 2)} kg)` : `Por lado: ${formatPlates(r.perSide)}`}</Txt>
          {/* Dibujo de la barra con los discos de un lado. */}
          <Row gap={2} style={{ alignItems: 'center', minHeight: 110 }}>
            <View style={styles.sleeveEnd} />
            {r.perSide.map((p, i) => (
              <View key={i} style={[styles.plate, { height: 40 + 70 * (p / maxPlate), backgroundColor: i % 2 ? colors.accentPressed : colors.accent }]}>
                <Txt variant="caption" color={colors.onAccent} style={{ transform: [{ rotate: '-90deg' }] }} numberOfLines={1}>
                  {fmtNum(p, 2)}
                </Txt>
              </View>
            ))}
            <View style={styles.bar} />
          </Row>
          <Txt variant="small" color={colors.textDim}>
            {`Barra ${fmtNum(barKg, 2)} kg + ${fmtNum(r.achievedKg - barKg, 2)} kg en discos = ${fmtNum(r.achievedKg, 2)} kg`}
          </Txt>
          {r.remainderKg > 0 && !r.belowBar ? (
            <Txt variant="small" color={colors.warning}>
              {`No cuadra exacto con tus discos: faltan ${fmtNum(r.remainderKg, 2)} kg.`}
            </Txt>
          ) : null}
        </>
      ) : null}
      <BigButton title="Cerrar" kind="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderColor: colors.accent,
    padding: space.lg,
  },
  plate: { width: 26, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 12, backgroundColor: colors.textFaint, borderRadius: 3 },
  sleeveEnd: { width: 8, height: 24, backgroundColor: colors.textFaint, borderRadius: 2 },
});
