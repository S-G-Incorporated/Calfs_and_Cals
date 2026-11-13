import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/lib/theme';

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      {title ? (
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme();
  return <Text style={[styles.muted, { color: t.textSecondary }, style]}>{children}</Text>;
}

export function Field(props: TextInputProps & { flex?: number }) {
  const t = useTheme();
  const { flex, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={t.textSecondary}
      {...rest}
      style={[styles.field, { backgroundColor: t.field, color: t.text, flex, minWidth: 0 }, style]}
    />
  );
}

export function Button({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.buttonLabel, { color: t.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  detail,
  color,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  color: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? color : t.field, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.chipLabel, { color: selected ? t.onAccent : t.text }]}>{label}</Text>
      {detail ? (
        <Text style={[styles.chipDetail, { color: selected ? t.onAccent : t.textSecondary }]}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ProgressBar({ fraction, color }: { fraction: number; color: string }) {
  const t = useTheme();
  const width: ViewStyle['width'] = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  return (
    <View style={[styles.track, { backgroundColor: t.field }]}>
      <View style={[styles.fill, { backgroundColor: color, width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  muted: { fontSize: 13 },
  field: { borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 17 },
  button: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: { fontSize: 15, fontWeight: '600' },
  chipDetail: { fontSize: 13 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
