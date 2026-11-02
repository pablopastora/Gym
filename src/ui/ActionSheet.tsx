import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Txt, type IconName } from './components';
import { colors, radius, space, TOUCH } from './theme';

export interface SheetAction {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

/** Menú inferior de acciones (Android limita Alert a 3 botones). */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar menú" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        {title ? (
          <Txt variant="label" color={colors.textDim} style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
            {title}
          </Txt>
        ) : null}
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              onClose();
              a.onPress();
            }}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surface2 }]}>
            {a.icon ? <Icon name={a.icon} color={a.destructive ? colors.accentText : colors.textDim} /> : null}
            <Txt variant="bodyBold" color={a.destructive ? colors.accentText : colors.text}>
              {a.label}
            </Txt>
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={({ pressed }) => [styles.item, styles.cancel, pressed && { opacity: 0.7 }]}>
          <Txt variant="button" color={colors.textDim}>
            Cancelar
          </Txt>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderColor: colors.accent,
    paddingTop: space.sm,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH, paddingHorizontal: space.lg },
  cancel: { justifyContent: 'center', marginTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
