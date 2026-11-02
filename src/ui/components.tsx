import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, space, TOUCH } from './theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 24, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

type TxtVariant = keyof typeof font;

export function Txt({
  children,
  variant = 'body',
  color = colors.text,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[font[variant], { color }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/** Contenedor de pantalla con scroll y márgenes estándar. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface2 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="caption" color={colors.textDim} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';

export function BigButton({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.surface2,
    danger: colors.danger,
    ghost: 'transparent',
  }[kind];
  const fg = kind === 'secondary' || kind === 'ghost' ? colors.text : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={22} color={fg} />}
          <Txt variant="bodyBold" color={fg}>
            {title}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  color = colors.text,
  size = 26,
  label,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.surface2 }]}>
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; suffix?: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="small" color={colors.textDim}>
        {label}
      </Txt>
      <View style={[styles.inputWrap, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          style={[styles.input, input.multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: space.md }]}
          {...input}
        />
        {suffix ? (
          <Txt color={colors.textDim} style={{ paddingRight: space.md }}>
            {suffix}
          </Txt>
        ) : null}
      </View>
      {error ? (
        <Txt variant="caption" color={colors.danger}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color={colors.textFaint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}>
            <Txt variant="bodyBold" color={active ? colors.onPrimary : colors.textDim}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Txt variant="small" color={active ? colors.onPrimary : colors.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Stat({ label, value, sub, color = colors.text }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="caption" color={colors.textDim}>
        {label}
      </Txt>
      <Txt variant="h2" color={color}>
        {value}
      </Txt>
      {sub ? (
        <Txt variant="caption" color={colors.textFaint}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

export function Banner({ kind, children }: { kind: 'info' | 'ok' | 'warning' | 'danger'; children: ReactNode }) {
  const map = {
    info: [colors.primaryDim, colors.primary, 'information-outline'],
    ok: [colors.successDim, colors.success, 'check-circle-outline'],
    warning: [colors.warningDim, colors.warning, 'alert-outline'],
    danger: [colors.dangerDim, colors.danger, 'alert-octagon-outline'],
  } as const;
  const [bg, fg, icon] = map[kind];
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: fg }]}>
      <Icon name={icon} size={20} color={fg} />
      <Txt variant="small" style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.surface2 }]}>
      {icon && <Icon name={icon} size={24} color={colors.textDim} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyBold" numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color={colors.textDim} numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={48} color={colors.textFaint} />
      <Txt variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {text ? (
        <Txt color={colors.textDim} style={{ textAlign: 'center' }}>
          {text}
        </Txt>
      ) : null}
    </View>
  );
}

export function Row({
  children,
  gap = space.md,
  align = 'center',
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: 'center' | 'flex-start' | 'flex-end';
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  button: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  iconButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, minHeight: TOUCH - 4, paddingHorizontal: space.md, color: colors.text, fontSize: 18 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  banner: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH + 8,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
  },
  empty: { alignItems: 'center', gap: space.md, padding: space.xxl },
});
