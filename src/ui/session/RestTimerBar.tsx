import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtDuration } from '@/domain/format';
import { restRemainingS } from '@/domain/workout';
import { useNow } from '@/hooks/useNow';
import { useRestTimer } from '@/stores/restTimer';

import { Txt } from '../components';
import { colors, radius, space } from '../theme';

/** Barra inferior con la cuenta atrás del descanso: −15 s, +15 s y saltar. */
export function RestTimerBar() {
  const rest = useRestTimer((s) => s.rest);
  const adjust = useRestTimer((s) => s.adjust);
  const skip = useRestTimer((s) => s.skip);
  const now = useNow(250, !!rest);
  const insets = useSafeAreaInsets();
  if (!rest) return null;
  const left = restRemainingS(rest, now);
  const progress = rest.totalS > 0 ? Math.min(1, Math.max(0, 1 - left / rest.totalS)) : 1;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + space.sm }]} accessibilityLiveRegion="polite">
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.content}>
        <View style={{ flex: 1 }}>
          <Txt variant="label" color={colors.textDim}>
            Descanso
          </Txt>
          <Txt variant="displayL">{fmtDuration(left)}</Txt>
          <Txt variant="caption" color={colors.textFaint} numberOfLines={1}>
            {rest.label ? `Siguiente: ${rest.label}` : ' '}
          </Txt>
        </View>
        <Btn label="−15" onPress={() => adjust(-15)} />
        <Btn label="+15" onPress={() => adjust(15)} />
        <Btn label="Saltar" onPress={skip} primary />
      </View>
    </View>
  );
}

function Btn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        primary && { backgroundColor: pressed ? colors.accentPressed : colors.accent, minWidth: 84 },
        pressed && !primary && { backgroundColor: colors.border },
      ]}>
      <Txt variant="button" color={primary ? colors.onAccent : colors.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
  track: { height: 4, backgroundColor: colors.surface2 },
  fill: { height: 4, backgroundColor: colors.accent },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  btn: {
    minWidth: 60,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
});
